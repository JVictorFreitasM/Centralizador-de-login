# Fluxos OAuth2

Diagramas de sequência refletindo o comportamento real de
[src/services/oauth.service.ts](../src/services/oauth.service.ts) — não um
fluxo OAuth2 genérico de livro-texto.

## 1. Authorization Code — caminho feliz (sem sessão prévia)

```mermaid
sequenceDiagram
    participant User as Usuário (navegador)
    participant Client as Sistema cliente<br/>(idp-client)
    participant IdP as IdP
    participant LoginUI as login-ui

    User->>Client: GET /painel (rota protegida)
    Client-->>User: redirect /auth/login?returnTo=/painel
    Client->>Client: gera state, guarda na sessão local
    Client-->>User: redirect GET /authorize?client_id=...&redirect_uri=...&state=...

    User->>IdP: GET /authorize
    IdP->>IdP: valida client_id + redirect_uri (match EXATO)
    Note over IdP: sem sessionUserId (sem cookie idp.sid válido)
    IdP-->>User: redirect IDP_LOGIN_URL?return_to=/authorize?...

    User->>LoginUI: GET /login-ui?return_to=...
    LoginUI->>IdP: POST /login { email, password }
    IdP->>IdP: valida credenciais (bcrypt), cria sessão (idp.sid)
    IdP-->>LoginUI: 200 { mustChangePassword: false }
    LoginUI-->>User: navega de volta pro return_to (GET /authorize de novo)

    User->>IdP: GET /authorize (agora com sessão)
    IdP->>IdP: valida UserSystemAccess ativo no sistema
    IdP->>IdP: cria AuthorizationCode (60s)
    IdP-->>User: redirect redirect_uri?code=...&state=...

    User->>Client: GET /auth/callback?code=...&state=...
    Client->>Client: valida state (CSRF)
    Client->>IdP: POST /token { grant_type: authorization_code, code, client_secret }
    IdP->>IdP: valida code (não expirado, não usado, redirect_uri confere)
    IdP->>IdP: marca code usado, emite access+refresh token (novo familyId)
    IdP-->>Client: { access_token, refresh_token, expires_in }
    Client->>Client: guarda tokens em req.session.idpAuth (nunca no front)
    Client-->>User: redirect /painel

    User->>Client: GET /painel
    Client->>Client: requireAuth valida JWT localmente (via JWKS)
    Client-->>User: 200 (painel renderizado)
```

## 2. Casos especiais de `GET /authorize`

```mermaid
flowchart TD
    A[GET /authorize] --> B{client_id/redirect_uri<br/>validos?}
    B -->|nao| C["400 invalid_request<br/>(NUNCA redireciona)"]
    B -->|sim| D{response_type == code?}
    D -->|nao| E["redirect redirect_uri?error=unsupported_response_type"]
    D -->|sim| F{tem sessao valida?}
    F -->|nao| G["redirect IDP_LOGIN_URL?return_to=..."]
    F -->|sim, mas mustChangePassword| H["redirect IDP_PASSWORD_CHANGE_URL"]
    F -->|sim| I{UserSystemAccess<br/>ativo no sistema?}
    I -->|nao| J["redirect redirect_uri?error=access_denied"]
    I -->|sim| K["cria AuthorizationCode<br/>redirect redirect_uri?code=...&state=..."]
```

A distinção entre "erro antes de confiar no `redirect_uri`" (400 direto,
`C`) e "erro depois" (redirect com `?error=`, `E`/`J`) é deliberada — ver
[SEGURANCA.md](./SEGURANCA.md#validação-de-redirect_uri--post_logout_redirect_uri).

## 3. Renovação de token (`grant_type=refresh_token`)

```mermaid
sequenceDiagram
    participant Client as Sistema cliente
    participant IdP as IdP

    Client->>Client: access_token expirado (requireAuth detecta)
    Client->>IdP: POST /token { grant_type: refresh_token, refresh_token, client_secret }
    IdP->>IdP: autentica o SISTEMA (client_secret, timingSafeEqual)
    IdP->>IdP: busca refresh token pelo hash

    alt token não encontrado ou de outro sistema
        IdP-->>Client: 400 invalid_grant
    else token já revogado (REUSO)
        IdP->>IdP: revoga a LINHAGEM INTEIRA (familyId)
        IdP->>IdP: grava AuditLog ACCESS_REVOKED (reuse_detected)
        IdP-->>Client: 400 invalid_grant "refresh token ja utilizado"
    else token expirado
        IdP-->>Client: 400 invalid_grant "refresh token expirado"
    else token válido
        IdP->>IdP: revoga o token atual
        IdP->>IdP: reconfere UserSystemAccess ativo
        alt usuário perdeu o acesso nesse meio-tempo
            IdP-->>Client: 400 invalid_grant (loadActiveAccessOrThrow lança)
            Note over Client: próxima renovação falha -> força novo login
        else acesso ainda ativo
            IdP->>IdP: emite novo access_token + refresh_token (MESMO familyId)
            IdP-->>Client: { access_token, refresh_token, expires_in }
        end
    end
```

## 4. Logout (RP-Initiated Logout)

```mermaid
sequenceDiagram
    participant User as Usuário (navegador)
    participant Client as Sistema cliente<br/>(idp-client)
    participant IdP as IdP

    User->>Client: GET /auth/logout
    Client->>IdP: POST /revoke { token: refresh_token, client_id, client_secret }
    Note over IdP: RFC 7009 - sempre 200, mesmo se ja invalido/de outro sistema
    IdP->>IdP: revoga o refresh token, grava AuditLog LOGOUT
    IdP-->>Client: 200
    Client->>Client: destroi sessao local (req.session.idpAuth)
    Client-->>User: redirect IdP GET /session/end?client_id=...&post_logout_redirect_uri=...

    User->>IdP: GET /session/end
    IdP->>IdP: valida post_logout_redirect_uri (match EXATO contra System.postLogoutRedirectUris)
    IdP->>IdP: destroi sessao do IdP (cookie idp.sid)
    IdP-->>User: redirect post_logout_redirect_uri
```

Sem o passo `/session/end`, o SSO reautenticaria silenciosamente no próximo
`/authorize` (a sessão do IdP ainda existiria) — o usuário nunca veria a
tela de login de novo, mesmo achando que saiu.

## Referências

- Implementação real: [src/services/oauth.service.ts](../src/services/oauth.service.ts)
- Claims e validação do JWT: [validacao-de-token.md](./validacao-de-token.md)
- Uso do SDK: [CLIENT_SDK.md](./CLIENT_SDK.md)
