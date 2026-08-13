# Autenticação

O IdP tem **dois mecanismos de autenticação separados** - não confundir:

| Mecanismo | Cookie/Token | Usado por |
|---|---|---|
| Sessão do IdP | Cookie `idp.sid` (httpOnly) | Painel administrativo, `/me`, `/me/systems`, `/login-ui` |
| OAuth2 (Authorization Code) | `access_token` JWT (RS256) | Sistemas clientes (Farol, Bot, TVs) autenticando seus próprios usuários |

Logar no IdP **não** gera um `access_token` OAuth2 automaticamente - só depois de passar pelo fluxo `/authorize` → `/token`.

## OAuth2 Authorization Code Flow

1. **Sistema cliente redireciona pro `/auth/login` dele mesmo** (não direto pro `/authorize` do IdP - é o `/auth/login` que gera e guarda o `state` anti-CSRF, via `idp-client`):
   ```
   GET http://localhost:3001/auth/login
   ```

2. **`/auth/login` redireciona pro `/authorize` do IdP:**
   ```
   GET http://localhost:3000/authorize?client_id=...&redirect_uri=http://localhost:3001/auth/callback&response_type=code&state=...
   ```

3. **Sem sessão no IdP**, o usuário loga (`/login-ui`, que chama `POST /login`). Com sessão já ativa, pula direto pro passo 4.

4. **IdP redireciona de volta pro sistema cliente com o `code`:**
   ```
   GET http://localhost:3001/auth/callback?code=AUTH_CODE&state=...
   ```
   `code` válido por **60 segundos**, uso único.

5. **O BACKEND do sistema cliente** (nunca o navegador) troca o `code` por tokens:
   ```bash
   curl -X POST http://localhost:3000/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=AUTH_CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=http://localhost:3001/auth/callback"
   ```

6. **Resposta:**
   ```json
   {
     "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refresh_token": "8f2c...",
     "token_type": "Bearer",
     "expires_in": 900
   }
   ```

Os tokens ficam **só na sessão do backend do sistema cliente** (cookie httpOnly próprio dele) - nunca chegam ao navegador do usuário em nenhum momento.

## Usar o access_token

```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:3001/alguma-rota-protegida
```

A validação é **local**, via JWKS - o sistema cliente nunca chama o IdP de volta pra validar um token (só na primeira vez que vê um `kid` desconhecido).

## Renovar (refresh_token)

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=<refresh_token>&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"
```

## Validade dos tokens

| Token | Validade |
|---|---|
| `code` (authorization code) | 60 segundos, uso único |
| `access_token` | 15 minutos |
| `refresh_token` | 30 dias |

## JWT Claims

```json
{
  "sub": "user-uuid",
  "email": "usuario@empresa.com",
  "name": "Nome do Usuário",
  "system": "farol",
  "role": "gerente",
  "iss": "idp-centralizador-login",
  "aud": "CLIENT_ID_DO_SISTEMA",
  "iat": 1755000000,
  "exp": 1755000900
}
```

`role` reflete o papel do usuário **naquele sistema especificamente** (um token nunca carrega papéis de outros sistemas). `aud` é o `client_id`, não o nome do sistema - `requireAuth` do `idp-client` valida isso explicitamente pra impedir que um token válido de um sistema seja aceito por outro.

## JWKS Endpoint (validação local)

```bash
curl http://localhost:3000/.well-known/jwks.json
```

```json
{
  "keys": [
    { "kty": "RSA", "kid": "...", "use": "sig", "alg": "RS256", "n": "...", "e": "AQAB" }
  ]
}
```

Público, sem autenticação. O `idp-client` mantém cache local (TTL configurável, `jwksCacheTtlMs`, padrão 1h) e refaz a busca sozinho se aparecer um `kid` desconhecido - cobre rotação de chave sem exigir restart manual dos sistemas clientes.

## RP-Initiated Logout (encerrar a sessão SSO)

Chamar só `/logout` do sistema cliente derruba a sessão **dele**, mas a sessão do IdP continua viva - o próximo `/authorize` reautentica silenciosamente. Pra encerrar as duas:

```
GET http://localhost:3000/session/end?client_id=CLIENT_ID&post_logout_redirect_uri=http://localhost:5174/
```

`post_logout_redirect_uri` precisa estar cadastrado em `System.postLogoutRedirectUris` (match exato, não por origem) - endpoint separado do `redirectUris` do OAuth. O `idp-client` já chama isso automaticamente no `createLogoutHandler`.
