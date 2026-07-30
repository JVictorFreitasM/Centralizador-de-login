// Erros de dominio lancados pelos Services. O handler global de erros
// (src/app.ts) sabe converter qualquer DomainError em resposta HTTP - os
// Controllers so relancam (via asyncHandler) e nunca decidem status/corpo
// eles mesmos para esses casos.
export abstract class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    // Nas rotas de auth/usuario (legado da OS 02) `code` e a propria
    // mensagem em portugues (o corpo da resposta e so { error: code }).
    // Nas rotas OAuth2 (OS 03) `code` e o codigo curto do padrao
    // (invalid_client, invalid_grant, ...) e `description`, quando
    // presente, vai em `error_description` - convencao herdada das duas
    // OS's originais, preservada aqui pra nao mudar nenhuma resposta.
    public readonly code: string,
    public readonly description?: string
  ) {
    super(description ?? code);
  }

  toResponseBody(): { error: string; error_description?: string } {
    return this.description ? { error: this.code, error_description: this.description } : { error: this.code };
  }
}

// --- Validacao de formato de DTO (400) ---
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(400, message);
  }
}

// --- Auth local (OS 02) ---
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(401, "Credenciais invalidas");
  }
}

export class NotAuthenticatedError extends DomainError {
  constructor() {
    super(401, "Nao autenticado");
  }
}

export class ForbiddenTIError extends DomainError {
  constructor() {
    super(403, "Acesso restrito a TI");
  }
}

export class PasswordChangeRequiredError extends DomainError {
  constructor() {
    super(403, "Troca de senha obrigatoria antes de continuar");
  }
}

export class IncorrectPasswordError extends DomainError {
  constructor() {
    super(401, "Senha atual incorreta");
  }
}

// --- Gestao de usuario (OS 02) ---
export class EmailAlreadyExistsError extends DomainError {
  constructor() {
    super(409, "Ja existe um usuario com este e-mail");
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super(404, "Usuario nao encontrado");
  }
}

// --- OAuth2 (OS 03) ---
// "invalid_client" e usado com status diferente em /authorize (400, cliente
// desconhecido/inativo) e /token (401, falha de autenticacao do cliente) -
// por isso duas classes em vez de uma so com statusCode fixo.
export class UnknownClientError extends DomainError {
  constructor() {
    super(400, "invalid_client");
  }
}

export class ClientAuthenticationError extends DomainError {
  constructor() {
    super(401, "invalid_client");
  }
}

export class InvalidRedirectUriError extends DomainError {
  constructor() {
    super(400, "invalid_redirect_uri");
  }
}

export class UnsupportedGrantTypeError extends DomainError {
  constructor() {
    super(400, "unsupported_grant_type");
  }
}

export class OAuthRequestValidationError extends DomainError {
  constructor() {
    super(400, "invalid_request");
  }
}

export class InvalidGrantError extends DomainError {
  constructor(description?: string) {
    super(400, "invalid_grant", description);
  }
}

export class TokenAccessDeniedError extends DomainError {
  constructor() {
    super(403, "access_denied", "usuario sem acesso a este sistema");
  }
}

// --- Gestao de sistemas/papeis/acessos (OS 06 - painel de administracao) ---
export class SlugAlreadyExistsError extends DomainError {
  constructor() {
    super(409, "Ja existe um sistema com este slug");
  }
}

export class SystemNotFoundError extends DomainError {
  constructor() {
    super(404, "Sistema nao encontrado");
  }
}

export class RoleAlreadyExistsError extends DomainError {
  constructor() {
    super(409, "Ja existe um papel com este nome neste sistema");
  }
}

export class RoleNotFoundError extends DomainError {
  constructor() {
    super(404, "Papel nao encontrado");
  }
}

export class RoleInUseError extends DomainError {
  constructor() {
    super(409, "Papel em uso - revogue os acessos que o usam antes de remove-lo");
  }
}

export class RoleBelongsToOtherSystemError extends DomainError {
  constructor() {
    super(400, "Papel nao pertence ao sistema informado");
  }
}

export class AccessAlreadyGrantedError extends DomainError {
  constructor() {
    super(409, "Usuario ja tem acesso ativo a este sistema");
  }
}

export class AccessNotFoundError extends DomainError {
  constructor() {
    super(404, "Acesso nao encontrado");
  }
}

export class AccessAlreadyRevokedError extends DomainError {
  constructor() {
    super(409, "Este acesso ja foi revogado");
  }
}
