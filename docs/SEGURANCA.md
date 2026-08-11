# Segurança

Resumo prático dos mecanismos de segurança implementados — cada item aponta
pro código real que o implementa (não é uma lista de intenção).

## Senhas

- Hash com `bcryptjs`, **12 rounds** ([src/lib/password.ts](../src/lib/password.ts)) —
  comparação em tempo constante (`bcrypt.compare`), nunca comparação direta
  de string.
- **Sem self-service de cadastro**: só um `isTI=true` cria usuário. Senha
  nunca é escolhida pelo TI — o sistema gera uma senha temporária aleatória
  de 8 caracteres, sem caracteres ambíguos (`0/O`, `1/l/I` — repassada
  verbalmente/por texto ao funcionário), e força `mustChangePassword=true`.
- Senha nunca aparece em log (`src/lib/redact.ts` redige o corpo da
  requisição antes de logar erros — ver [src/app.ts](../src/app.ts)).

## Tokens

| Token | Algoritmo/Formato | TTL padrão | Observação |
|---|---|---|---|
| Access token | JWT **RS256** (assimétrico) | 900s (15 min) — `ACCESS_TOKEN_TTL_SECONDS` | Chave privada nunca sai do IdP; sistemas clientes validam com a chave pública via JWKS |
| Refresh token | Aleatório (32 bytes, base64url), armazenado como hash SHA-256 | 30 dias — `REFRESH_TOKEN_TTL_SECONDS` | Rotacionado a cada uso; nunca reaproveitado |
| Authorization code | Aleatório (32 bytes, base64url) | 60s — `AUTHORIZATION_CODE_TTL_SECONDS` | Uso único, curtíssima duração de propósito |
| `client_secret` | Comparado via SHA-256 + `timingSafeEqual` | — | Nunca em texto puro após a criação do `System` (só na resposta da própria criação/regeneração) |

- **`kid` no header do JWT**: fingerprint SHA-256 da própria chave pública
  ([src/lib/jwtKeys.ts](../src/lib/jwtKeys.ts)) — não é um valor configurado
  manualmente, então não tem como ficar dessincronizado numa rotação de
  chave futura.
- **Detecção de reuso — `code`**: `code` OAuth2 já usado sendo apresentado
  de novo revoga **todo** `RefreshToken` ativo do usuário naquele sistema
  (não só o suspeito) e grava `ACCESS_REVOKED` em auditoria com
  `reason: "authorization_code_reuse_detected"`.
- **Detecção de reuso — `refresh_token`**: token já revogado sendo
  apresentado de novo revoga a **linhagem inteira** (`familyId`), não só o
  token em questão — qualquer token da mesma linhagem pode ter sido
  comprometido junto.
- **Rotação**: toda troca via `refresh_token` revoga o token atual e emite
  um novo na mesma linhagem, reconferindo `UserSystemAccess` ativo no
  processo. É esse recheck que faz uma revogação de acesso ter efeito
  (impede a *próxima* renovação) — ver limitação abaixo.
- **`POST /revoke` (RFC 7009)**: sempre `200`, mesmo para token
  inexistente/já revogado/de outro sistema — nunca revela a um chamador se
  um token específico é ou não válido.

### Limitação conhecida do modelo JWT

Revogar `UserSystemAccess` no painel administrativo **não invalida
instantaneamente** um `access_token` já emitido — só impede a próxima
renovação via `refresh_token` (que reconfere o acesso a cada rotação). Um
token em mãos continua válido até expirar naturalmente (15 min por
padrão). Isso é comunicado explicitamente na tela de revogação de acesso do
painel administrativo.

## Sessão do IdP

- Cookie `idp.sid`: `httpOnly`, `sameSite=lax`, `secure` automaticamente
  ligado quando `NODE_ENV=production` (preparado para HTTPS antes mesmo
  dele estar ativo).
- `maxAge` de 12 horas — mais longa que o access token de qualquer sistema
  cliente, já que só controla "estou logado no IdP", não acesso a um
  sistema específico.
- Store: `PrismaSessionStore` sobre a tabela `sessions` (ver
  [SCHEMA.md](./SCHEMA.md)) — `pruneExpired` roda a cada 15 min removendo
  sessões vencidas.
- **Recarrega o usuário do banco a cada request** (`requireAuth`, não
  confia em dado salvo no cookie) — uma desativação (`active=false`) tem
  efeito imediato mesmo com sessão ainda "válida" no cookie.

## Validação de `redirect_uri` / `post_logout_redirect_uri`

Comparação **exata** contra a lista registrada em `System.redirectUris` /
`System.postLogoutRedirectUris` — nunca por prefixo, regex ou mesma
origem. É o ponto mais comum de vulnerabilidade em implementações caseiras
de OAuth2 (um `redirect_uri` aceito por prefixo permite abrir a porta para
um domínio controlado por atacante). Nada é redirecionado antes dessa
checagem passar — divergência responde erro direto (400 ou JSON
`invalid_redirect_uri`), nunca um redirect "melhor esforço".

## Rate limiting

`POST /login`: **5 tentativas com erro por IP a cada 15 minutos**
(`skipSuccessfulRequests: true` — só conta tentativas que falham; um login
certo não soma) ([src/middlewares/rateLimit.middleware.ts](../src/middlewares/rateLimit.middleware.ts)).
Mensagem de erro genérica, sem detalhar quantas tentativas restam além dos
headers padrão `RateLimit-*`.

> Contador em memória (sem store persistente/Redis) — reinicia junto com o
> processo do backend.

## Validação de entrada

Todas as rotas validam o corpo/query com **zod** na fronteira (camada de
DTO, `src/dtos/`) antes de qualquer Service ser chamado:

- E-mail: formato válido, normalizado para minúsculas antes de qualquer
  comparação/persistência.
- Slug de `System`: `^[a-z0-9]+(-[a-z0-9]+)*$` — nunca aceita espaço ou
  maiúscula, evita ambiguidade nas claims do token.
- `redirectUris`/`postLogoutRedirectUris`: cada item precisa ser uma URL
  válida (`new URL(...)` não lança).

## Auditoria

Toda ação relevante grava `AuditLog`: `LOGIN_SUCCESS`, `LOGIN_FAILED`,
`LOGOUT`, `SYSTEM_ACCESS`, `ACCESS_GRANTED`, `ACCESS_REVOKED`,
`USER_CREATED`, `USER_UPDATED`, `PASSWORD_CHANGED`, `TOKEN_ISSUED`.
Convenção: `userId` é sempre o *sujeito* da ação; quando quem executou é
outra pessoa (ex.: TI criando usuário), isso vai em `metadata.performedBy`
— nunca sobrescreve o sujeito.

## Segredos nunca versionados

- `keys/private.pem` — chave privada RSA (gerada localmente, `.gitignore`).
- `.env` (real) — só `.env.example` com placeholders é versionado.
- `client_secret`/senha temporária/`client_secret` regenerado: só aparecem
  em texto puro na resposta HTTP que os gera — nunca persistidos em log,
  nunca reexibidos depois (painel usa `SecretRevealModal`, que descarta o
  valor do estado do React ao fechar).
