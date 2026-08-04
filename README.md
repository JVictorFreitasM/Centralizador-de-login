# IdP - Login Centralizado

- Modelagem de dados do Identity Provider (schema, migrations, seed).
- Autenticação local: cadastro de usuário (TI), login/logout com sessão
  própria do IdP, troca de senha obrigatória no primeiro acesso.
- Fluxo OAuth2 Authorization Code: `/authorize` e `/token`, emissão de
  access token JWT assinado (RS256).
- Arquitetura em camadas (Controller/Service/Repository/DTO).
- Endpoint JWKS público, `kid` no header do JWT, claims definitivas
  (`name`, `system`) e documentação de validação pros sistemas clientes.
- Painel de administração (React, [admin-frontend/](admin-frontend/)):
  gestão de usuários, sistemas, papéis e concessão de acesso; tela de
  auditoria. Rotas administrativas no backend (System/Role/UserSystemAccess
  CRUD).
- Refresh token com rotação: `/token` emite também `refresh_token`,
  `grant_type=refresh_token` para renovação, detecção de reuso (revoga a
  linhagem inteira), e `POST /revoke` (RFC 7009).
- Client SDK ([idp-client/](idp-client/)): middleware Express reutilizável
  (`createIdpAuth`) que qualquer sistema do parque instala pra se integrar
  ao IdP sem reimplementar o fluxo OAuth2/JWT — login, callback,
  `requireAuth` com renovação automática, `requireRole`, logout. Validado
  com um sistema de teste mínimo em [example-client-app/](example-client-app/).
- Interface pública de login ([login-ui/](login-ui/)): as telas reais de
  `/login-ui` e `/change-password-ui` que o `/authorize` redireciona quando
  não há sessão — sem elas nenhum fluxo de autenticação completa via
  navegador.
- Containerização local (Docker Compose): banco, backend (API + `login-ui`)
  e `admin-frontend`, com hot-reload — substitui instalação manual de
  Node/PostgreSQL na máquina de dev.

## Arquitetura

```
src/
├── controllers/   camada HTTP - le req, monta DTO, chama o Service, monta a resposta. Nunca contem regra de negocio.
├── services/      toda a logica de negocio (hash, tokens, RBAC, auditoria). Nao conhece Request/Response, so chama repositories/.
├── repositories/  unico lugar que fala com o Prisma Client - um por entidade principal.
├── dtos/          formato de entrada/saida entre camadas, validado com zod na fronteira. DTO de saida nunca inclui campo sensivel.
├── middlewares/   sessao, rate limit, gate de troca de senha obrigatoria.
├── routes/        so liga rota (metodo + path) -> controller.
├── errors/        DomainError e subclasses - o handler global (src/app.ts) traduz pra status/corpo HTTP.
└── prisma/        instancia unica do PrismaClient (so repositories/ e o Store de sessao a importam).
```

Decisão registrada: **sem pasta `entities/`** — os Services/Repositories
usam os tipos gerados pelo Prisma Client diretamente (`User`, `System`,
etc.) como Entity. Pragmático pro tamanho atual do projeto; o
desacoplamento total de uma Entity própria só compensaria com um plano
real de trocar de ORM, o que não é o caso aqui.

`PrismaSessionStore` ([src/lib/sessionStore.ts](src/lib/sessionStore.ts)) é a
única exceção documentada à regra "só repositories/ fala com o Prisma": ela
implementa o contrato de `Store` do `express-session` (infraestrutura de
sessão, não uma consulta de domínio).

## Stack

Node + Express + TypeScript + Prisma 6 + PostgreSQL.

## Rodando localmente (Docker — recomendado)

Três containers via Docker Compose: banco (Postgres, sem porta exposta ao
host), backend (API + `login-ui`, hot-reload) e `admin-frontend` (hot-reload).
Substitui instalação manual de Node/PostgreSQL na máquina de dev.

1. Copie `.env.example` para `.env` (`DATABASE_URL` e `PORT` são
   sobrescritos pelo `environment:` do Compose — o resto das variáveis é
   reaproveitado do `.env`).

2. Gere o par de chaves RSA (precisa existir **antes** de subir o backend —
   sem elas a assinatura de token falha; roda fora do Docker, exige Node
   local, ou via container avulso se não tiver Node instalado):

   ```
   npm install
   npm run generate:keys
   # ou, sem Node local:
   docker run --rm -v "${PWD}:/app" -w /app node:20-alpine sh -c "npm install && npm run generate:keys"
   ```

3. Suba tudo:

   ```
   docker compose up -d --build
   ```

   Ordem de subida: Postgres (com healthcheck — o backend só inicia depois
   dele responder `pg_isready`, não só do container ter "subido") →
   `prisma migrate deploy` automático → build do `login-ui` → API. Sem
   passo manual de migration — no Contracheque Bot esse passo foi
   esquecido uma vez e gerou erro (`table does not exist`) no primeiro
   teste; aqui está garantido no `command:` do serviço `backend`.

4. Popule o banco **(container fresco nasce vazio — critério de aceite
   "dados persistem entre reinicializações" vale pro volume, não elimina a
   necessidade do seed na primeira subida)**:

   ```
   docker exec idp-backend npm run seed
   ```

5. Acesse:
   - API + `login-ui`: **http://localhost:3000** (`/login-ui`, `/change-password-ui`, `/.well-known/jwks.json`, etc.)
   - Painel administrativo: **http://localhost:5175** *(não 5173/5174 — já ocupadas nesta máquina de teste pelo Contracheque Bot e pelo Farol, respectivamente)*

**Hot-reload**: bind mount do Docker Desktop no Windows não propaga eventos
nativos de sistema de arquivos pro container — os dois serviços usam
**polling** (`ts-node-dev --poll` no backend, `server.watch.usePolling` no
Vite do `admin-frontend`) pra funcionar de verdade nessa combinação. Editar
um arquivo no host reflete sem rebuild.

**Migrations/dependências novas**: se mudar `prisma/schema.prisma` ou
`package.json`, `docker compose up -d --build` sozinho pode não bastar — os
volumes anônimos de `node_modules` só são renovados de fato com
`docker compose up -d --build -V <servico>` (`-V` força recriar os volumes
anônimos a partir da imagem nova).

### Sem Docker (rodando backend/admin-frontend direto no host)

Ainda funciona, mas o Postgres do `docker-compose.yml` não expõe porta ao
host (de propósito, ver seção 3.1 da OS de containerização) — pra isso,
suba um Postgres à parte com porta publicada (`docker run -d -p 5435:5432
-e POSTGRES_USER=idp -e POSTGRES_PASSWORD=idp -e POSTGRES_DB=idp
postgres:17`) e aponte `DATABASE_URL` no `.env` pra
`postgresql://idp:idp@localhost:5435/idp?schema=public`. Depois:

```
npm install
npm run prisma:migrate
npm run seed
npm run generate:keys
npm run build:login-ui
npm run dev
```

## Autenticação local

Rotas expostas (sem prefixo — ver [src/app.ts](src/app.ts)):

| Rota | Auth | Descrição |
|---|---|---|
| `POST /login` | pública, rate limited (5 tentativas falhas / 15 min por IP) | `{ email, password }` → cookie de sessão do IdP + `{ mustChangePassword }`. Erro sempre genérico ("Credenciais invalidas"), sem revelar se o e-mail existe. |
| `POST /logout` | sessão válida | Destrói a sessão do IdP. |
| `POST /password/change` | sessão válida (liberada mesmo com `mustChangePassword=true`) | `{ currentPassword, newPassword }`. Zera `mustChangePassword`. |
| `POST /users` | sessão válida + `isTI=true` + `mustChangePassword=false` | Cria usuário real. Senha nunca é escolhida pelo TI: gera senha temporária (8 chars) e retorna no corpo da resposta, `mustChangePassword=true`. |
| `PATCH /users/:id` | idem | `{ active }` — ativa/desativa. Usuário inativo não loga mesmo com senha certa. |
| `POST /users/:id/reset-password` | idem | Gera nova senha temporária e marca `mustChangePassword=true` de novo. |
| `GET /me` | sessão válida | Dados do usuário logado — usado pela SPA do painel pra restaurar sessão num refresh. |

Detalhes de implementação:

- **Sessão**: `express-session` com um `Store` próprio sobre a tabela
  `sessions` do Prisma ([src/lib/sessionStore.ts](src/lib/sessionStore.ts)) —
  fica na mesma base/migrations do resto do schema, sem depender de uma
  tabela criada por fora do Prisma. Cookie `httpOnly`, `sameSite=lax`,
  `secure` ligado automaticamente quando `NODE_ENV=production` (preparado
  pra HTTPS antes mesmo dele estar ativo). Sessão dura 12h — mais que o
  access token dos sistemas clientes, já que só controla "estou logado no
  IdP".
- **`mustChangePassword`**: enquanto ativo, a sessão autentica normalmente
  mas toda rota de gestão de usuário fica bloqueada (403) até a troca de
  senha — ver `blockIfMustChangePassword` em
  [src/middlewares/mustChangePassword.middleware.ts](src/middlewares/mustChangePassword.middleware.ts).
- **`isTI`**: flag simples em `User` que restringe as rotas de gestão de
  usuário — provisório até um modelo de permissões mais rico.
- **Auditoria**: toda ação relevante grava `AuditLog` (`LOGIN_SUCCESS`,
  `LOGIN_FAILED`, `LOGOUT`, `USER_CREATED`, `USER_UPDATED`,
  `PASSWORD_CHANGED`). Convenção: `userId` é sempre o *sujeito* da ação;
  quando quem executou é outra pessoa (ex.: TI criando usuário),
  isso vai em `metadata.performedBy`.
- **Seed de dev** ([prisma/seed.ts](prisma/seed.ts)) é um arquivo separado
  da rota real de cadastro ([src/services/user.service.ts](src/services/user.service.ts))
  — só reaproveita a função de hash (`hashPassword`), nunca lógica de rota.
  Também cria o System fake e concede ao usuário de teste acesso `comum` a
  ele, necessário pra exercitar o fluxo OAuth2 de ponta a ponta.

## Interface pública de login — [login-ui/](login-ui/)

React + Vite, telas para `/login-ui` e `/change-password-ui` — os destinos
pra onde `/authorize` redireciona quando não há sessão válida (ver seção
seguinte). **Servida pelo próprio backend do IdP, na mesma origem**
(`src/lib/publicAuthUi.ts` serve o build em `login-ui/dist` diretamente via
Express), de propósito: assim `IDP_LOGIN_URL`/`IDP_PASSWORD_CHANGE_URL`
continuam paths relativos, sem precisar de CORS nem preocupação de cookie
cross-site para o formulário chamar `POST /login`. Rode `npm run build:login-ui`
(script no `package.json` da raiz) antes de subir o backend — se o build não
existir, o Express loga um aviso e essas duas rotas respondem 404 em vez de
travar o processo.

- **Layout público** (sem sidebar — ainda não há usuário autenticado):
  cartão centralizado, mesmos tokens de CSS/Font Awesome/tema claro-escuro
  da referência visual, reaproveitados quase sem alteração
  ([src/index.css](login-ui/src/index.css)).
- **`return_to`**: lido da query string, só aceito se resolver pra mesma
  origem do IdP — path relativo ou URL absoluta com `origin` idêntico
  ([src/lib/returnTo.js](login-ui/src/lib/returnTo.js)). Qualquer outra
  coisa (domínio externo, `//evil.com` protocol-relative) é rejeitada —
  proteção contra open redirect, já que um atacante poderia montar um link
  de login legítimo com `return_to` apontando pra fora.
- **Encadeamento login → troca de senha**: se `mustChangePassword=true`, o
  Login navega (client-side, sem recarregar a página) para
  `/change-password-ui?return_to=...`, passando a senha recém-digitada via
  estado do React Router — evita pedir a senha atual de novo. Se essa tela
  for aberta diretamente (ex.: `/authorize` redireciona pra cá sem passar
  pelo login, porque a sessão já existia mas a senha ainda não foi trocada),
  o formulário mostra um campo de "senha atual" como alternativa — sem essa
  rede de segurança, o fluxo trava nesse caso.
- **Erros sempre genéricos**: a UI só exibe a mensagem que a API já
  devolve (ex.: `"Credenciais invalidas"`, ou a mensagem de rate limit
  `"Muitas tentativas de login. Tente novamente mais tarde."` num `429`) —
  nunca deduz nem detalha o motivo por conta própria.

Rodando localmente:

```
npm run build:login-ui   # a partir da raiz - instala e builda login-ui/
npm run dev               # sobe o backend, que passa a servir /login-ui e /change-password-ui
```

## OAuth2 Authorization Code

Rotas ([src/routes/oauth.routes.ts](src/routes/oauth.routes.ts) →
[src/controllers/oauth.controller.ts](src/controllers/oauth.controller.ts) →
[src/services/oauth.service.ts](src/services/oauth.service.ts)):

| Rota | Descrição |
|---|---|
| `GET /authorize` | `client_id`, `redirect_uri`, `response_type=code`, `state` (opcional) na query string. Valida `client_id`/`redirect_uri` (comparação **exata** contra `System.redirectUris`) antes de qualquer redirect — divergência aí sempre responde 400 direto, nunca redireciona. Sem sessão → redireciona pra `IDP_LOGIN_URL` com `return_to`. Com `mustChangePassword=true` → redireciona pra `IDP_PASSWORD_CHANGE_URL`. Sem `UserSystemAccess` ativo no sistema → volta pro `redirect_uri` com `error=access_denied`. Caso contrário, gera `AuthorizationCode` (60s, configurável) e redireciona `redirect_uri?code=...&state=...`. |
| `POST /token` | `grant_type=authorization_code` **ou** `refresh_token` (form-urlencoded, padrão OAuth2 — `express.urlencoded` também está montado). Autentica o **sistema** (não o usuário) comparando `client_secret` contra `clientSecretHash` em tempo constante. Sempre retorna `access_token` (JWT RS256, claims na seção "JWKS e claims" abaixo) **+ `refresh_token`**. |
| `POST /revoke` | `token` (refresh token), `client_id`, `client_secret`. Revoga o token — usado no logout dos sistemas clientes. Segue RFC 7009: sempre `200`, mesmo pra token inexistente/já revogado/de outro sistema (nunca revela validade de um token pra quem não o possui). |

**Reuso de `code`** (grant `authorization_code`) e **reuso de `refresh_token`**
(grant `refresh_token`) são tratados como incidente de segurança, não erro
trivial: um token/code já usado sendo apresentado de novo é sinal de
interceptação. No caso do `code`, revoga todo `RefreshToken` ativo do
usuário nesse sistema. No caso do `refresh_token`, revoga a **linhagem
inteira** (`familyId`) — não só o token apresentado, já que qualquer token
da mesma linhagem pode ter sido comprometido junto. Ambos gravam
`ACCESS_REVOKED` em auditoria.

**Rotação**: cada troca via `refresh_token` revoga o token atual e emite um
novo na mesma linhagem (`familyId`), junto com um novo `access_token`. A
rotação também reconfere se o usuário ainda tem `UserSystemAccess` ativo no
sistema — é o mecanismo real por trás da limitação documentada mais abaixo:
revogar acesso não invalida um `access_token` já emitido, mas impede a
próxima renovação.

Chaves JWT: `npm run generate:keys` gera `keys/private.pem` (nunca
versionada) e `keys/public.pem`.

## JWKS e claims

| Rota | Auth | Descrição |
|---|---|---|
| `GET /.well-known/jwks.json` | pública, de propósito | Publica a chave **pública** atual no formato JWK (`kty`, `n`, `e`, `kid`, `use`, `alg`) — é assim que qualquer sistema cliente valida a assinatura do token localmente, sem chamar o IdP a cada request. `Cache-Control: public, max-age=3600` na resposta. |

- **`kid`**: todo JWT emitido em `/token` carrega `kid` no header
  ([src/services/token.service.ts](src/services/token.service.ts), via a
  opção `keyid` do `jsonwebtoken`), calculado como o fingerprint SHA-256 da
  própria chave pública
  ([src/lib/jwtKeys.ts](src/lib/jwtKeys.ts)) — muda sozinho se o par RSA for
  rotacionado (`npm run generate:keys --force`), sem depender de um valor
  configurado manualmente ficar sincronizado.
- **Claims definitivas**: `sub`, `email`, `name`, `iss`, `aud` (`client_id`),
  `system` (slug, ex. `"farol"`), `role`, `iat`, `exp`.
- **Validação pelos sistemas clientes**: passo a passo completo, com
  exemplo em `jose`, em
  [docs/validacao-de-token.md](docs/validacao-de-token.md) — já
  implementado de fato pelo Client SDK. Destaque: validar `aud` é
  **obrigatório** do lado do cliente; sem isso um token válido de um
  sistema poderia ser aceito por outro que confie na mesma chave pública do
  IdP.

## Painel de administração

### Backend — rotas administrativas

Todas exigem sessão válida + `isTI=true` + `mustChangePassword=false` (mesmo
guard de `/users`).

| Rota | Descrição |
|---|---|
| `GET /me` | Sessão válida (sem exigir TI) — usado pelo front pra saber "quem está logado" ao carregar/recarregar a página. |
| `GET /users` | Lista paginada, busca por nome/e-mail (`?search=&page=&limit=`). |
| `GET /systems` / `POST /systems` | Lista / cria sistema. Na criação, `client_id`/`client_secret` são gerados automaticamente — o secret em texto puro só vem nessa resposta. |
| `PATCH /systems/:id` | Atualiza `name`/`redirectUris`/`active`. |
| `POST /systems/:id/regenerate-secret` | Gera um novo secret (o antigo para de funcionar imediatamente) — só o novo valor em texto puro na resposta. |
| `GET /systems/:systemId/roles` / `POST /systems/:systemId/roles` | Lista / cria papel dentro do sistema. Único por `(systemId, name)`. |
| `PATCH /roles/:id` / `DELETE /roles/:id` | Edita / remove papel. Remoção é delete físico de verdade (`Role` não está na lista de "nunca deletar", ver Schema abaixo) — bloqueado com 409 se algum `UserSystemAccess` (ativo ou histórico) referenciar o papel. |
| `GET /users/:userId/access` | Acessos **ativos** de um usuário (sistema + papel). |
| `POST /access` | Concede acesso `{ userId, systemId, roleId }`. 409 se já existir um acesso ativo pra esse par usuário/sistema. |
| `POST /access/:id/revoke` | Revoga (`revokedAt`) — não deleta a linha. |
| `PATCH /access/:id/role` | Troca de papel = revoga o acesso atual e cria um novo, atomicamente (transação em [userSystemAccess.repository.ts](src/repositories/userSystemAccess.repository.ts)), preservando o histórico. |
| `GET /audit-logs` | Paginada, filtros `userId`/`systemId`/`action`/`from`/`to`. Só existe o verbo GET nessa rota — auditoria é somente leitura de propósito. |

### Frontend — [admin-frontend/](admin-frontend/)

React + Vite, visual replicado do projeto de referência enviado
(`frontend-referencia/`): mesmos tokens de CSS
([src/index.css](admin-frontend/src/index.css)/[App.css](admin-frontend/src/App.css)
copiados quase sem alteração), mesmos componentes `SearchInput`/`PaginationComponent`,
sidebar dark fixa com tema claro/escuro via `data-theme`+`localStorage`, Font Awesome.

- **Rotas do front** (`/usuarios`, `/sistemas`, `/acessos`, `/auditoria`,
  `/entrar`, `/trocar-senha`) foram escolhidas em português de propósito —
  o backend do IdP não usa prefixo `/api` (rotas na raiz), então o dev
  server do Vite ([vite.config.js](admin-frontend/vite.config.js)) faz proxy
  por path específico (`/login`, `/users`, `/systems`, ...) pro backend;
  rotas do front que colidissem com esses prefixos quebrariam a navegação
  client-side.
- **Autenticação da SPA**: [src/context/AuthContext.jsx](admin-frontend/src/context/AuthContext.jsx)
  chama `GET /me` ao montar pra restaurar sessão num refresh de página;
  `ProtectedRoute` redireciona pra `/entrar` sem sessão, pra
  `/trocar-senha` com `mustChangePassword=true`, e mostra "acesso restrito"
  pra sessão válida porém não-TI.
- **Segredos exibidos uma única vez** (senha temporária, `client_secret`):
  `SecretRevealModal` — nunca persistido no estado depois de fechado, só
  existe no retorno da própria chamada que o gerou.
- **Confirmação explícita** antes de desativar usuário, revogar acesso ou
  regenerar `client_secret` (`ConfirmModal`) — a tela de revogação de
  acesso avisa explicitamente que um `access_token` já emitido continua
  válido até expirar naturalmente (limitação do modelo JWT).
- **Deploy**: `Dockerfile` + `nginx.conf` espelham o padrão da referência
  (build Vite → nginx servindo `dist/` com `try_files` pro SPA), trocando o
  único `location /api/` por vários `location` explícitos pros mesmos
  prefixos do proxy de dev.

Rodando localmente (com o backend já de pé em `:3000`):

```
cd admin-frontend
npm install
npm run dev
```

## Client SDK

[idp-client/](idp-client/) — pacote `@copperline/idp-client`, middleware
Express reutilizável pra qualquer sistema do parque (Farol, sistema sem
login, sistema EJS — todos Express) se integrar ao IdP sem reimplementar o
fluxo OAuth2/JWT. Ainda não publicado em registry privado (a decidir) — por
enquanto consumido como dependência `file:`/git.

```ts
const idpAuth = createIdpAuth({ idpUrl, clientId, clientSecret, redirectUri });
app.use(session({ /* sessao propria do sistema cliente */ }));
app.use(idpAuth.router); // GET /auth/login, /auth/callback, /auth/logout
app.get("/painel", idpAuth.requireAuth, handler);
app.get("/admin", idpAuth.requireAuth, requireRole("admin"), handler);
```

- **`requireAuth`**: sem token → redireciona pra `/auth/login?returnTo=...`.
  Token válido → valida localmente via JWKS (assinatura + `aud` contra o
  próprio `clientId`, obrigatório) sem chamar o IdP. Token expirado → tenta
  renovar via `refresh_token` automaticamente; se a renovação falhar por
  qualquer motivo (refresh também expirado/revogado, ou acesso do usuário
  revogado no meio-tempo) → sempre novo login, nunca erro genérico
  ([src/middleware/requireAuth.ts](idp-client/src/middleware/requireAuth.ts)).
- **`state` CSRF**: gerado em `/auth/login`, guardado na sessão local,
  validado em `/auth/callback` antes de trocar o `code`.
- **Cache de JWKS** ([src/jwks.ts](idp-client/src/jwks.ts)): busca uma vez,
  reaproveita por `jwksCacheTtlMs` (default 1h); busca de novo sozinho se
  aparecer um `kid` que o cache atual não tem (rotação de chave). Fetches
  concorrentes com cache frio compartilham a mesma requisição em vez de
  disparar N chamadas ao IdP.
- **Sessão server-side apenas**: `access_token`/`refresh_token` vivem só em
  `req.session.idpAuth` do sistema cliente — nunca chegam ao front, sirva
  ele server-rendered (EJS) ou uma SPA por trás da própria API do sistema.
- **`requireRole(role)`**: 403 se `req.user.role` não bater.

[example-client-app/](example-client-app/) é o sistema de teste mínimo que
valida a lib de ponta a ponta contra o IdP local: login via
redirecionamento, rota protegida, renovação automática observada via
`AuditLog` (`TOKEN_ISSUED` com `grantType=refresh_token`), `requireRole`
bloqueando papel incorreto, logout revogando o refresh token no IdP de fato
(não só localmente).

## Schema

O schema vive em [prisma/schema.prisma](prisma/schema.prisma) e está
comentado por entidade. Resumo das 7 tabelas:

| Modelo | Papel |
|---|---|
| `User` | Usuários cadastrados por TI (sem self-service). Nunca deletado fisicamente — `active=false` para desativar. Campos de auth: `mustChangePassword`, `isTI`. |
| `System` | Cada sistema interno (client OAuth) que consome o IdP: slug, clientId/clientSecretHash, redirectUris. |
| `Role` | Papel dentro de um sistema específico (não é global). Único por `(systemId, name)`. |
| `UserSystemAccess` | Concessão de acesso usuário→sistema com um papel. Revogação via `revokedAt` (nunca delete). Um acesso ativo por `(userId, systemId)`, garantido por índice único parcial (`WHERE revoked_at IS NULL`), adicionado na migration `add_active_user_system_access_unique`. |
| `RefreshToken` | Token de sessão por sistema, com `familyId` para agrupar a linhagem de tokens rotacionados e detectar reuso. Só o hash é armazenado. |
| `AuthorizationCode` | Código de uso único do Authorization Code Flow, vida curta, `usedAt` marca o resgate. |
| `AuditLog` | Trilha de auditoria centralizada (login, logout, emissão de token, concessão/revogação de acesso, etc.), `userId`/`systemId` opcionais. Ações: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SYSTEM_ACCESS`, `ACCESS_GRANTED`, `ACCESS_REVOKED`, `USER_CREATED`, `USER_UPDATED`, `PASSWORD_CHANGED`, `TOKEN_ISSUED`. |
| `Session` | Sessão local do IdP, usada pelo `Store` customizado do `express-session`. |

Notas de modelagem importantes (detalhadas nos comentários do schema):

- Nada de delete físico em `User`, `System`, `UserSystemAccess` — histórico
  preservado via `active`/`revokedAt`.
- `passwordHash`, `clientSecretHash`, `tokenHash` nunca em texto puro.
- Índices em todos os campos consultados a cada request de auth: `email`,
  `slug`, `clientId`, `code`, `tokenHash`.

## Banco de dados

Este projeto usa seu **próprio** container Postgres (`postgres-idp`, volume
`idp_pgdata`, rede Docker `idp-net` própria — sem porta exposta ao host),
isolado das redes/containers do Farol e do Contracheque Bot — não reaproveita
infraestrutura de outro sistema.
