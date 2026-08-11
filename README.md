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
  navegador. Inclui o menu central pós-login (`/home`): lista os sistemas
  com acesso concedido ao usuário, cada um levando direto ao `/authorize`
  daquele sistema.
- Containerização local (Docker Compose): banco, backend (API + `login-ui`)
  e `admin-frontend`, com hot-reload — substitui instalação manual de
  Node/PostgreSQL na máquina de dev.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Componentes, diagrama, decisões de design |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Banco de dados — 8 tabelas, diagrama ER, índices, soft/hard delete |
| [docs/SEGURANCA.md](docs/SEGURANCA.md) | Senhas, tokens, sessão, rate limiting, validação de `redirect_uri` |
| [docs/JWT_VALIDATION.md](docs/validacao-de-token.md) | Claims, JWKS, validação passo a passo (com exemplo em `jose`) |
| [docs/CLIENT_SDK.md](docs/CLIENT_SDK.md) | Como instalar/usar `@copperline/idp-client` num sistema cliente |
| [docs/FLUXOS_OAUTH2.md](docs/FLUXOS_OAUTH2.md) | Diagramas de sequência: Authorization Code, refresh, logout |
| [screenshots/](screenshots/) | Capturas de tela das interfaces (ver pendências no índice da pasta) |

## Arquitetura

Camadas: `controllers/` (HTTP) → `services/` (regra de negócio) →
`repositories/` (Prisma) → `dtos/` (validação zod na fronteira). Sem pasta
`entities/` — Services/Repositories usam os tipos gerados pelo Prisma Client
diretamente. Detalhes completos, diagrama de componentes e decisões
registradas em **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**.

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
| `GET /me/systems` *(OS 13)* | sessão válida | Sistemas com `UserSystemAccess` ativo do **próprio** usuário logado (nunca aceita `userId` por parâmetro) — `name`, `slug`, `role`, `loginUrl` pronto pra usar. `loginUrl` aponta pro `/auth/login` **do sistema cliente** (não pro `/authorize` do IdP direto — é o `/auth/login` que monta o `state` anti-CSRF do Client SDK antes de redirecionar pro `/authorize`; pular essa etapa faz o `/auth/callback` do sistema rejeitar com "Estado invalido ou expirado", mesmo com sessão do IdP válida). Nunca inclui `clientSecretHash`. Fonte do menu central ([login-ui/](login-ui/)). |

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

React + Vite, telas para `/login-ui`, `/change-password-ui` e `/home` (menu
central pós-login) — os destinos pra onde `/authorize` redireciona quando
não há sessão válida (ver seção seguinte), e pra onde o próprio login
manda o usuário quando não há um `return_to` (fluxo OAuth2 de um sistema
específico) em andamento. **Servida pelo próprio backend do IdP, na mesma
origem** (`src/lib/publicAuthUi.ts` serve o build em `login-ui/dist`
diretamente via Express), de propósito: assim
`IDP_LOGIN_URL`/`IDP_PASSWORD_CHANGE_URL` continuam paths relativos, sem
precisar de CORS nem preocupação de cookie cross-site para o formulário
chamar `POST /login`. Rode `npm run build:login-ui` (script no
`package.json` da raiz) antes de subir o backend — se o build não existir,
o Express loga um aviso e essas três rotas respondem 404 em vez de travar
o processo.

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
- **Menu central (`/home`, [src/pages/Home.jsx](login-ui/src/pages/Home.jsx))**:
  busca `GET /me` + `GET /me/systems` ao montar; sem sessão válida (`401`)
  redireciona pra `/login-ui`; com `mustChangePassword=true` ainda pendente
  (ex.: sessão antiga, chegou aqui sem passar pelo formulário de login)
  redireciona pra `/change-password-ui` — rede de segurança, não o fluxo
  normal. Um card por sistema com acesso ativo, clicável (navegação de
  página inteira pro `loginUrl` retornado pela API — o `/auth/login` do
  próprio sistema cliente, nunca o `/authorize` do IdP direto; o usuário já
  tem sessão do IdP, então esse `/authorize` resolve direto pro `code`, sem
  pedir login de novo). Sem nenhum acesso concedido, mostra estado vazio
  ("Você ainda não tem acesso a nenhum sistema..."), nunca um erro técnico.

Rodando localmente:

```
npm run build:login-ui   # a partir da raiz - instala e builda login-ui/
npm run dev               # sobe o backend, que passa a servir /login-ui, /change-password-ui e /home
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

Diagramas de sequência completos (caminho feliz, casos especiais de
`/authorize`, refresh, logout) em
**[docs/FLUXOS_OAUTH2.md](docs/FLUXOS_OAUTH2.md)**.

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
Express reutilizável pra qualquer sistema do parque (Farol, Gerenciamento
de TVs, Contracheque Bot — todos Express) se integrar ao IdP sem
reimplementar o fluxo OAuth2/JWT.

```ts
const idpAuth = createIdpAuth({ idpUrl, clientId, clientSecret, redirectUri });
app.use(session({ /* sessao propria do sistema cliente */ }));
app.use(idpAuth.router); // GET /auth/login, /auth/callback, /auth/logout
app.get("/painel", idpAuth.requireAuth, handler);
app.get("/admin", idpAuth.requireAuth, requireRole("admin"), handler);
```

Configuração completa, comportamento de `requireAuth`/`requireRole`, cache
de JWKS e o sistema de teste [example-client-app/](example-client-app/) em
**[docs/CLIENT_SDK.md](docs/CLIENT_SDK.md)**.

## Schema

Resumo das 8 tabelas, diagrama ER e política de soft/hard delete em
**[docs/SCHEMA.md](docs/SCHEMA.md)**. Schema real, comentado por entidade,
em [prisma/schema.prisma](prisma/schema.prisma) (fonte de verdade em caso
de divergência).

## Banco de dados

Este projeto usa seu **próprio** container Postgres (`postgres-idp`, volume
`idp_pgdata`, rede Docker `idp-net` própria — sem porta exposta ao host),
isolado das redes/containers do Farol e do Contracheque Bot — não reaproveita
infraestrutura de outro sistema.

## Screenshots

Menu central (`/home`) e duas telas do painel administrativo — restam
`/login-ui` e a tela de Acessos (ver [screenshots/](screenshots/) para o
índice completo).

![Menu central pós-login](screenshots/Menu%20sistemas%20idp.png)
![Painel administrativo - Sistemas](screenshots/Sistemas%20idp%20centralizador.jpg)
![Painel administrativo - Usuários](screenshots/Usuarios%20idp%20centralizador%20admin.jpg)
