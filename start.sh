#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Pelligavi — demo local (API + site) em um comando.
#
#   ./start.sh              sobe a demo (cria o banco na primeira vez)
#   ./start.sh --recriar    apaga o banco e aplica os 43 scripts de novo
#   ./start.sh --dev        modo desenvolvimento (Vite com hot reload)
#   ./start.sh --sem-build  pula a compilação (usa o que já está em dist/)
#   ./start.sh --ajuda      mostra esta ajuda
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

VERDE=$'\033[0;32m'; AMARELO=$'\033[0;33m'; VERMELHO=$'\033[0;31m'; ZERO=$'\033[0m'
ok()    { printf "%s  ok %s %s\n" "$VERDE" "$ZERO" "$1"; }
aviso() { printf "%s  !! %s %s\n" "$AMARELO" "$ZERO" "$1"; }
erro()  { printf "%s  xx %s %s\n" "$VERMELHO" "$ZERO" "$1" >&2; }
titulo(){ printf "\n%s== %s%s\n" "$VERDE" "$1" "$ZERO"; }

# --- argumentos -------------------------------------------------------------
RECRIAR=0; MODO_DEV=0; PULAR_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --recriar)  RECRIAR=1 ;;
    --dev)      MODO_DEV=1 ;;
    --sem-build) PULAR_BUILD=1 ;;
    -h|--ajuda|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) erro "argumento desconhecido: $arg"; exit 1 ;;
  esac
done

# --- .env -------------------------------------------------------------------
if [ -f .env ]; then
  set -a; . ./.env; set +a
  ok ".env carregado"
fi

PGHOST=${PGHOST:-127.0.0.1}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-postgres}
PGDATABASE=${PGDATABASE:-pelligavi}
PORT=${PORT:-8888}
export PGHOST PGPORT PGUSER PGDATABASE PORT

# --- pré-requisitos ---------------------------------------------------------
titulo "Conferindo o ambiente"

if ! command -v node >/dev/null 2>&1; then
  erro "Node.js não encontrado. Instale a versão 20 ou superior: https://nodejs.org"
  exit 1
fi
NODE_MAIOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAIOR" -lt 20 ]; then
  erro "Node.js $NODE_MAIOR encontrado, é preciso 20 ou superior."
  exit 1
fi
ok "Node.js $(node -v) · npm $(npm -v)"

if ! command -v psql >/dev/null 2>&1; then
  erro "psql não encontrado. Instale o cliente do PostgreSQL (pacote postgresql)."
  exit 1
fi
ok "psql $(psql --version | awk '{print $3}')"

ERRO_PG=$(psql -d postgres -tAc 'select 1' 2>&1 >/dev/null || true)
if [ -n "$ERRO_PG" ]; then
  erro "não consegui conectar em $PGUSER@$PGHOST:$PGPORT. O PostgreSQL está rodando? Confira o .env."
  printf '     %s\n' "$ERRO_PG" >&2
  exit 1
fi
ok "PostgreSQL respondendo em $PGHOST:$PGPORT"

# --- banco ------------------------------------------------------------------
titulo "Banco de dados"

existe_banco() {
  psql -tAc "select 1 from pg_database where datname = '$PGDATABASE'" postgres 2>/dev/null | grep -q 1
}

tabelas_no_banco() {
  psql -d "$PGDATABASE" -tAc \
    "select count(*) from information_schema.tables where table_schema = 'public'" 2>/dev/null | tr -d ' '
}

if [ "$RECRIAR" = "1" ] && existe_banco; then
  aviso "recriando o banco $PGDATABASE"
  psql -d postgres -qc "drop database if exists \"$PGDATABASE\"" >/dev/null
fi

if ! existe_banco; then
  ok "criando o banco $PGDATABASE"
  psql -d postgres -qc "create database \"$PGDATABASE\"" >/dev/null
fi

TOTAL_TABELAS=$(tabelas_no_banco || echo 0)
if [ "${TOTAL_TABELAS:-0}" -lt 30 ]; then
  aviso "banco vazio — aplicando os scripts de db/ (são 43, na ordem numérica)"
  for arquivo in $(ls db/*.sql | sort); do
    if ! psql -d "$PGDATABASE" -v ON_ERROR_STOP=1 -q -f "$arquivo" >/tmp/pelligavi-sql.log 2>&1; then
      erro "falhou em $arquivo:"
      tail -15 /tmp/pelligavi-sql.log >&2
      exit 1
    fi
    printf "     %s\n" "$(basename "$arquivo")"
  done
  ok "esquema, dados de exemplo e objetos aplicados ($(tabelas_no_banco) tabelas)"
else
  ok "banco já populado ($TOTAL_TABELAS tabelas)"
fi

# --- dependências e build ---------------------------------------------------
titulo "Código"

if [ ! -d node_modules ] || [ ! -d web/node_modules ]; then
  aviso "instalando dependências (pode levar alguns minutos)"
  npm install --no-audit --no-fund
  npm --prefix web install --no-audit --no-fund
  ok "dependências instaladas"
else
  ok "dependências já instaladas"
fi

if [ "$MODO_DEV" = "1" ]; then
  titulo "Modo desenvolvimento"
  ( npm run watch >/tmp/pelligavi-tsc.log 2>&1 & ) ; aviso "compilando TypeScript em segundo plano"
  npm run build:server >/dev/null 2>&1 || true
  ( node dist-server/bootstrap/server.js >/tmp/pelligavi-api.log 2>&1 & )
  aviso "API na porta $PORT (log: /tmp/pelligavi-api.log)"
  exec npm --prefix web run dev
fi

if [ "$PULAR_BUILD" = "0" ]; then
  aviso "compilando (TypeScript do servidor + site)"
  npm run build >/dev/null
  npm run web:build >/dev/null
  ok "build concluído"
fi

# --- subindo ----------------------------------------------------------------
titulo "Subindo"
printf "  site   http://127.0.0.1:%s/\n" "$PORT"
printf "  painel http://127.0.0.1:%s/painel\n" "$PORT"
printf "  saúde  http://127.0.0.1:%s/api/saude\n\n" "$PORT"
printf "  (Ctrl+C encerra)\n\n"

exec npm run serve
