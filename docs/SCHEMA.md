# Banco de Dados

Schema completo, comentado por entidade, em
[prisma/schema.prisma](../prisma/schema.prisma) — esta página resume e
ilustra as relações. **Fonte de verdade é o arquivo `.prisma`**, não esta
página, em caso de divergência.

## Diagrama ER

```mermaid
erDiagram
    USER ||--o{ USER_SYSTEM_ACCESS : "recebe"
    USER ||--o{ USER_SYSTEM_ACCESS : "concede (grantedBy)"
    SYSTEM ||--o{ USER_SYSTEM_ACCESS : "escopo"
    SYSTEM ||--o{ ROLE : "define"
    ROLE ||--o{ USER_SYSTEM_ACCESS : "atribuido"
    USER ||--o{ REFRESH_TOKEN : "possui"
    SYSTEM ||--o{ REFRESH_TOKEN : "escopo"
    USER ||--o{ AUTHORIZATION_CODE : "solicita"
    SYSTEM ||--o{ AUTHORIZATION_CODE : "escopo"
    USER ||--o{ AUDIT_LOG : "sujeito"
    SYSTEM ||--o{ AUDIT_LOG : "contexto"

    USER {
        uuid id PK
        string name
        string email UK
        string passwordHash
        boolean active
        boolean mustChangePassword
        boolean isTI
        uuid createdById FK
    }

    SYSTEM {
        uuid id PK
        string name
        string slug UK
        string clientId UK
        string clientSecretHash
        string_array redirectUris
        string_array postLogoutRedirectUris
        boolean active
    }

    ROLE {
        uuid id PK
        uuid systemId FK
        string name
        string description
    }

    USER_SYSTEM_ACCESS {
        uuid id PK
        uuid userId FK
        uuid systemId FK
        uuid roleId FK
        uuid grantedById FK
        datetime grantedAt
        datetime revokedAt
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid userId FK
        uuid systemId FK
        string tokenHash UK
        uuid familyId
        datetime expiresAt
        datetime revokedAt
    }

    AUTHORIZATION_CODE {
        uuid id PK
        string code UK
        uuid userId FK
        uuid systemId FK
        string redirectUri
        datetime expiresAt
        datetime usedAt
    }

    AUDIT_LOG {
        uuid id PK
        uuid userId FK
        uuid systemId FK
        string action
        json metadata
        datetime createdAt
    }

    SESSION {
        string sid PK
        string data
        datetime expiresAt
    }
```

> `SESSION` não tem FK pro resto do schema de propósito — guarda a sessão
> `express-session` serializada como JSON (`data`), não um relacionamento de
> domínio.

## Tabelas

| Modelo | Papel |
|---|---|
| `User` | Usuários cadastrados por TI (sem self-service). Nunca deletado fisicamente — `active=false` para desativar. Campos de auth: `mustChangePassword`, `isTI`. |
| `System` | Cada sistema interno (client OAuth2) que consome o IdP: slug, `clientId`/`clientSecretHash`, `redirectUris`, `postLogoutRedirectUris`. |
| `Role` | Papel dentro de um sistema específico (não é global). Único por `(systemId, name)`. |
| `UserSystemAccess` | Concessão de acesso usuário→sistema com um papel. Revogação via `revokedAt` (nunca delete). Um acesso ativo por `(userId, systemId)`, garantido por índice único parcial (`WHERE revoked_at IS NULL`), adicionado na migration `add_active_user_system_access_unique`. |
| `RefreshToken` | Token de sessão por sistema, com `familyId` agrupando a linhagem de tokens rotacionados (detecção de reuso). Só o hash (SHA-256) é armazenado. |
| `AuthorizationCode` | Código de uso único do Authorization Code Flow, vida curta (60s padrão), `usedAt` marca o resgate. |
| `AuditLog` | Trilha de auditoria centralizada. `userId`/`systemId` opcionais (nem toda ação tem os dois). Ações: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SYSTEM_ACCESS`, `ACCESS_GRANTED`, `ACCESS_REVOKED`, `USER_CREATED`, `USER_UPDATED`, `PASSWORD_CHANGED`, `TOKEN_ISSUED`. |
| `Session` | Sessão local do IdP, usada pelo `PrismaSessionStore` customizado do `express-session`. |

## Índices críticos

Todos em campos consultados a cada request de autenticação:

- `User.email` — busca no login
- `System.slug`, `System.clientId` — validação de OAuth2
- `RefreshToken.tokenHash` — busca segura na renovação/revogação
- `AuthorizationCode.code` — troca do code por token
- `UserSystemAccess (userId, systemId)` (índice único parcial, ativo) — checagem de acesso a cada `/authorize` e a cada rotação de refresh token
- `AuditLog.userId`, `AuditLog.systemId`, `AuditLog.action` — consultas da tela de auditoria

## Soft delete vs. hard delete

| Entidade | Política | Motivo |
|---|---|---|
| `User` | Soft (`active=false`) | Histórico de auditoria precisa continuar referenciando o usuário |
| `System` | Soft (`active=false`) | Idem — tokens/códigos antigos e logs continuam válidos como registro |
| `UserSystemAccess` | Soft (`revokedAt`) | Trilha completa de quem teve acesso a quê e quando |
| `RefreshToken` | Soft (`revokedAt`) | Necessário para detectar reuso de token já revogado |
| `Role` | **Hard delete** | Não faz parte da trilha de auditoria por si só — mas é bloqueado (409) se algum `UserSystemAccess` (ativo ou histórico) ainda referenciar o papel |
| `AuthorizationCode` | Nem soft nem hard — `usedAt` marca resgate, e a linha expira naturalmente (TTL curto, 60s) | Vida útil curta demais para justificar preservação |

Regra geral: **nada que alimente auditoria é deletado fisicamente.**
