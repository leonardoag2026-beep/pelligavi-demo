#!/usr/bin/env bash
# Endereco atual do tunel e teste de saude dos tres servicos.
set -u
URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cf-pizzaria-react.log | tail -1)
echo "tunel:     ${URL:-<nenhum>}"
echo "postgres:  $(systemctl --user is-active pizzaria-pg.service) $(pg_isready -h /tmp -p 5433 2>&1 | tail -1)"
echo "api:       $(systemctl --user is-active pizzaria-api.service) $(curl -s -o /dev/null -w 'site %{http_code}' http://127.0.0.1:8888/)"
echo "cloudflare:$(systemctl --user is-active pizzaria-tunnel.service)"
[ -n "$URL" ] && echo "externo:   site $(curl -s -o /dev/null -w '%{http_code}' "$URL/" --max-time 20) api $(curl -s -o /dev/null -w '%{http_code}' "$URL/api/cardapio" --max-time 20)"
