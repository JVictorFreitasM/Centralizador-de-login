#!/bin/bash
# docs/examples/curl.sh - Exemplos de uso da API do IdP
set -e

IDP="http://localhost:3000"

echo "=== 1. Login local (sessao do IdP, cookie idp.sid) ==="
curl -s -c cookies.txt -X POST "$IDP/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"senha123"}' | jq .

echo -e "\n=== 2. Usuario logado ==="
curl -s -b cookies.txt "$IDP/me" | jq .

echo -e "\n=== 3. Sistemas com acesso (menu central, OS 13) ==="
curl -s -b cookies.txt "$IDP/me/systems" | jq .

echo -e "\n=== 4. JWKS (publico, sem autenticacao) ==="
curl -s "$IDP/.well-known/jwks.json" | jq .

echo -e "\n=== 5. OAuth2: trocar authorization code por tokens ==="
echo "(precisa de um code valido, obtido via /authorize - so 60s de validade)"
curl -s -X POST "$IDP/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=SEU_CODE&client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&redirect_uri=http://localhost:3001/auth/callback" | jq .

echo -e "\n=== 6. OAuth2: renovar access_token via refresh_token ==="
curl -s -X POST "$IDP/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=SEU_REFRESH_TOKEN&client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET" | jq .

echo -e "\n=== 7. RP-Initiated Logout (encerra sessao SSO) ==="
curl -s -i "$IDP/session/end?client_id=SEU_CLIENT_ID&post_logout_redirect_uri=http://localhost:5174/"

echo -e "\n=== 8. Logout local (sessao do IdP) ==="
curl -s -b cookies.txt -X POST "$IDP/logout" -w "\nHTTP %{http_code}\n"

echo -e "\n=== 9. [Admin/TI] Listar sistemas cadastrados ==="
echo "(precisa de sessao com isTI=true - repita o passo 1 com um usuario TI)"
curl -s -b cookies.txt "$IDP/systems" | jq .

rm -f cookies.txt
echo -e "\nConcluido."
