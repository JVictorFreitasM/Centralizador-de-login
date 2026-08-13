# Códigos de Erro

## Formato REAL de erro

Diferente de esquemas genéricos (`{message, code, details, timestamp}`), este backend usa **dois estilos**, dependendo da rota:

**Rotas legadas (auth, usuários, painel admin)** - `error` já é a mensagem em português:
```json
{ "error": "Credenciais invalidas" }
```

**Rotas OAuth2 (RFC 6749/7009)** - `error` é um código curto padronizado, com `error_description` opcional:
```json
{ "error": "invalid_grant", "error_description": "code expirado" }
```

Nunca há `timestamp`, `details` ou `code` adicional em nenhum dos dois formatos.

## Status codes em uso

| Código | Quando |
|---|---|
| 400 | Validação de formato (zod) ou de regra OAuth2 (`invalid_request`, `invalid_redirect_uri`, `invalid_client` em `/authorize`, `unsupported_grant_type`, `invalid_grant`, `RoleBelongsToOtherSystemError`) |
| 401 | Sem sessão (`NotAuthenticatedError`), credenciais inválidas, senha atual incorreta, ou `invalid_client` em `/token`/`/revoke` (diferente do 400 em `/authorize` - ver tabela completa abaixo) |
| 403 | `ForbiddenTIError` (rota admin sem ser TI), `PasswordChangeRequiredError`, `TokenAccessDeniedError` (usuário sem acesso ao sistema) |
| 404 | Recurso não encontrado (usuário, sistema, papel, acesso) |
| 409 | Conflito (e-mail/slug/nome de papel já existe, acesso já concedido/revogado, papel em uso) |
| 429 | Rate limit excedido (só `POST /login`) |
| 500 | Erro não previsto (`{"error": "Erro interno"}`, sem detalhes do erro real vazando pra fora) |

## Catálogo completo (todo DomainError do backend)

| Classe | Status | `error` |
|---|---|---|
| `ValidationError` | 400 | mensagem de validação (zod) |
| `InvalidCredentialsError` | 401 | `Credenciais invalidas` |
| `NotAuthenticatedError` | 401 | `Nao autenticado` |
| `ForbiddenTIError` | 403 | `Acesso restrito a TI` |
| `PasswordChangeRequiredError` | 403 | `Troca de senha obrigatoria antes de continuar` |
| `IncorrectPasswordError` | 401 | `Senha atual incorreta` |
| `EmailAlreadyExistsError` | 409 | `Ja existe um usuario com este e-mail` |
| `UserNotFoundError` | 404 | `Usuario nao encontrado` |
| `UnknownClientError` | 400 | `invalid_client` (usado em `/authorize`) |
| `ClientAuthenticationError` | 401 | `invalid_client` (usado em `/token`, `/revoke`) |
| `InvalidRedirectUriError` | 400 | `invalid_redirect_uri` |
| `UnsupportedGrantTypeError` | 400 | `unsupported_grant_type` |
| `OAuthRequestValidationError` | 400 | `invalid_request` |
| `InvalidGrantError` | 400 | `invalid_grant` (+ `error_description` opcional) |
| `TokenAccessDeniedError` | 403 | `access_denied` — `usuario sem acesso a este sistema` |
| `SlugAlreadyExistsError` | 409 | `Ja existe um sistema com este slug` |
| `SystemNotFoundError` | 404 | `Sistema nao encontrado` |
| `RoleAlreadyExistsError` | 409 | `Ja existe um papel com este nome neste sistema` |
| `RoleNotFoundError` | 404 | `Papel nao encontrado` |
| `RoleInUseError` | 409 | `Papel em uso - revogue os acessos que o usam antes de remove-lo` |
| `RoleBelongsToOtherSystemError` | 400 | `Papel nao pertence ao sistema informado` |
| `AccessAlreadyGrantedError` | 409 | `Usuario ja tem acesso ativo a este sistema` |
| `AccessNotFoundError` | 404 | `Acesso nao encontrado` |
| `AccessAlreadyRevokedError` | 409 | `Este acesso ja foi revogado` |

## Exemplos

### 401 - Credenciais inválidas

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"errada"}'

HTTP/1.1 401 Unauthorized
{ "error": "Credenciais invalidas" }
```

A mensagem é sempre genérica de propósito - nunca revela se o problema foi o e-mail ou a senha.

### 429 - Rate limit

```bash
HTTP/1.1 429 Too Many Requests
{ "error": "Muitas tentativas de login. Tente novamente mais tarde." }
```

### 403 - Sem permissão (rota admin)

```bash
curl -b cookies.txt http://localhost:3000/users

HTTP/1.1 403 Forbidden
{ "error": "Acesso restrito a TI" }
```

### 400 - OAuth2 invalid_grant

```bash
curl -X POST http://localhost:3000/token \
  -d "grant_type=authorization_code&code=EXPIRADO&client_id=x&client_secret=y&redirect_uri=z"

HTTP/1.1 400 Bad Request
{ "error": "invalid_grant", "error_description": "code expirado" }
```
