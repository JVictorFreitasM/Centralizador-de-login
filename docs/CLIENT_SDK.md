# Client SDK — `@copperline/idp-client`

[idp-client/](../idp-client/) — middleware Express reutilizável para
qualquer sistema do parque (Farol, Gerenciamento de TVs, Contracheque Bot —
todos Express) se integrar ao IdP sem reimplementar o fluxo OAuth2/JWT.

## Instalação

Ainda não publicado em registry privado — consumido como dependência de
path/git:

```json
{
  "dependencies": {
    "@copperline/idp-client": "file:../Centralizador-de-login/idp-client"
  }
}
```

Rode `npm run build` dentro de `idp-client/` antes — o pacote é consumido a
partir de `dist/`.

## Uso básico

```ts
import express from "express";
import session from "express-session";
import { createIdpAuth, requireRole } from "@copperline/idp-client";

const idpAuth = createIdpAuth({
  idpUrl: process.env.IDP_URL!,
  clientId: process.env.IDP_CLIENT_ID!,
  clientSecret: process.env.IDP_CLIENT_SECRET!,
  redirectUri: process.env.IDP_REDIRECT_URI!,
});

const app = express();

// A lib NÃO traz sessão própria - cada sistema cliente configura a sua.
app.use(session({ secret: "...", resave: false, saveUninitialized: false }));

app.use(idpAuth.router); // monta GET /auth/login, /auth/callback, /auth/logout

app.get("/painel", idpAuth.requireAuth, (req, res) => {
  res.send(`Olá, ${req.user!.name} (${req.user!.role})`);
});

app.get("/admin", idpAuth.requireAuth, requireRole("admin"), (req, res) => {
  res.send("Só admin entra aqui.");
});

app.listen(3001);
```

## Configuração (`IdpClientConfig`)

| Campo | Obrigatório | Default | Descrição |
|---|---|---|---|
| `idpUrl` | sim | — | URL base do IdP usada server-to-server (troca de code por token, JWKS, revoke) — chamada de dentro do processo/container do sistema cliente. |
| `authorizeUrl` | não | `idpUrl` | URL base do IdP usada só pra montar os redirects que vão pro navegador (`GET /authorize` e `GET /session/end`). Só precisa divergir de `idpUrl` quando backend e navegador não enxergam o IdP pelo mesmo hostname/porta (ex.: backend containerizado falando via `host.docker.internal`, mas o navegador precisa de `localhost`). |
| `homeUrl` | não | `${idpUrl}/home` | Menu central do IdP — destino do botão "Voltar aos sistemas" e do pós-logout. |
| `clientId` / `clientSecret` | sim | — | Credenciais do sistema, cadastradas no painel de administração. `clientSecret` só no backend, nunca no front. |
| `redirectUri` | sim | — | Deve bater **exatamente** com um dos `redirectUris` cadastrados no sistema no IdP. |
| `loginPath` / `callbackPath` / `logoutPath` | não | `/auth/login`, `/auth/callback`, `/auth/logout` | Paths montados no router. |
| `postLoginRedirect` / `postLogoutRedirect` | não | `/` | Fallback quando não há `returnTo`. |
| `jwksCacheTtlMs` | não | `3600000` (1h) | Cache do JWKS — busca de novo automaticamente se aparecer um `kid` desconhecido (rotação de chave). |
| `issuer` | não | — | Se definido, valida `iss` do token além de `aud`. |

## Comportamento de `requireAuth`

1. Sem token na sessão → redireciona pra `${loginPath}?returnTo=...`.
2. Token válido → valida localmente via JWKS (assinatura + `aud` **contra o
   próprio `clientId`**, obrigatório) sem chamar o IdP.
3. Token expirado (ou inválido por qualquer motivo) → tenta renovar via
   `refresh_token`; se a renovação também falhar (refresh também
   expirado/revogado, ou acesso do usuário revogado no meio-tempo) →
   sempre novo login, **nunca** um erro genérico sem direcionamento
   ([idp-client/src/middleware/requireAuth.ts](../idp-client/src/middleware/requireAuth.ts)).

## `req.user`

Depois de `requireAuth`, `req.user` tem `{ sub, email, name, role, system }`
— as claims do access token já validado. **Nunca o JWT cru.**

## Outras features

- **`state` CSRF**: gerado em `${loginPath}`, guardado na sessão local do
  sistema cliente, validado em `${callbackPath}` antes de trocar o `code`.
- **Cache de JWKS** ([idp-client/src/jwks.ts](../idp-client/src/jwks.ts)):
  busca uma vez, reaproveita por `jwksCacheTtlMs`; busca de novo sozinho se
  aparecer um `kid` que o cache atual não tem. Fetches concorrentes com
  cache frio compartilham a mesma requisição em vez de disparar N chamadas
  ao IdP.
- **Sessão server-side apenas**: `access_token`/`refresh_token` vivem só em
  `req.session.idpAuth` do sistema cliente — nunca chegam ao front, sirva
  ele server-rendered (EJS) ou uma SPA por trás da própria API do sistema.
- **`requireRole(role)`**: 403 se `req.user.role` não bater. Precisa vir
  **depois** de `requireAuth` na cadeia de middlewares.
- **Logout (`${logoutPath}`)**: revoga o refresh token no IdP
  (best-effort — se o IdP estiver fora, a sessão local é encerrada do
  mesmo jeito), destrói a sessão local e só então redireciona pro
  `/session/end` do IdP (RP-Initiated Logout) — necessário para também
  encerrar a sessão do IdP em si (cookie `httpOnly` de outra origem,
  invisível pro backend do sistema cliente). Sem esse passo, o SSO
  reautenticaria silenciosamente no próximo `/authorize`.

## Limitação herdada do modelo JWT

Ver [SEGURANCA.md](./SEGURANCA.md#limitação-conhecida-do-modelo-jwt) —
revogar acesso no painel não invalida instantaneamente um `access_token`
já emitido.

## Exemplo de sistema mínimo

[example-client-app/](../example-client-app/) valida a lib de ponta a
ponta contra o IdP local: login via redirecionamento, rota protegida,
renovação automática observada via `AuditLog` (`TOKEN_ISSUED` com
`grantType=refresh_token`), `requireRole` bloqueando papel incorreto,
logout revogando o refresh token no IdP de fato (não só localmente).

## Validação de token (sem o SDK)

Se um sistema não puder usar o SDK Express (ex.: outra linguagem/runtime),
ver [validacao-de-token.md](./validacao-de-token.md) para o passo a passo
completo de validação manual do JWT via JWKS.
