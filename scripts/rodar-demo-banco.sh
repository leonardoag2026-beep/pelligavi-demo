#!/usr/bin/env bash
# Sobe a API do Pelligavi ligada ao MySQL (3307) com os dados de demonstracao.
set -e
cd "$(dirname "$0")/.."
PORTA="${PORT:-8810}"
echo "API:  http://127.0.0.1:$PORTA/api/saude"
echo "Dados: pedidos, cozinha, relatorios, notificacoes e caixa"
PORT="$PORTA" node server/mysql/api.js
