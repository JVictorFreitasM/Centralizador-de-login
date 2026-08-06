import { randomBytes, randomUUID } from "crypto";
import { systemRepository } from "../repositories/system.repository";
import { userRepository } from "../repositories/user.repository";
import { userSystemAccessRepository, type ActiveAccessWithRole } from "../repositories/userSystemAccess.repository";
import { authorizationCodeRepository } from "../repositories/authorizationCode.repository";
import { refreshTokenRepository } from "../repositories/refreshToken.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { matchesHash, sha256Hex } from "../lib/hash";
import { tokenService } from "./token.service";
import type {
  AuthorizeDecision,
  AuthorizeInputDTO,
  RevokeRequestDTO,
  TokenRequestDTO,
  TokenResponseDTO,
} from "../dtos/oauth.dto";
import { AuthorizationCodeGrantFieldsSchema, RefreshTokenGrantFieldsSchema, RevokeRequestFieldsSchema } from "../dtos/oauth.dto";
import {
  ClientAuthenticationError,
  InvalidGrantError,
  InvalidRedirectUriError,
  OAuthRequestValidationError,
  TokenAccessDeniedError,
  UnknownClientError,
  UnsupportedGrantTypeError,
} from "../errors/domain.errors";
import { ACCESS_TOKEN_TTL_SECONDS } from "./token.service";
import type { System, User } from "@prisma/client";

const AUTH_CODE_TTL_SECONDS = Number(process.env.AUTHORIZATION_CODE_TTL_SECONDS ?? 60);
// Refresh token dura bem mais que o access token (15 min) - e ele quem
// sustenta a sessao "de verdade" no sistema cliente entre renovacoes
// silenciosas (OS 04/07). Default: 30 dias.
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30);

// Emite o par access_token/refresh_token pra um usuario+sistema+papel ja
// validados. `familyId` agrupa a linhagem de tokens rotacionados - um novo
// familyId so nasce na emissao inicial (authorization_code); toda rotacao
// subsequente (refresh_token) reaproveita o mesmo familyId, o que permite
// detectar reuso (OS 04, ver exchangeRefreshToken).
async function issueTokenPair(
  user: User,
  system: System,
  role: string | null,
  familyId: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = tokenService.signAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    clientId: system.clientId,
    systemSlug: system.slug,
    role,
  });

  const refreshToken = randomBytes(32).toString("base64url");
  await refreshTokenRepository.create({
    userId: user.id,
    systemId: system.id,
    tokenHash: sha256Hex(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return { accessToken, refreshToken };
}

async function loadActiveAccessOrThrow(
  userId: string,
  systemId: string
): Promise<{ user: User; access: ActiveAccessWithRole }> {
  const user = await userRepository.findById(userId);
  if (!user || !user.active) {
    throw new InvalidGrantError("usuario inativo");
  }
  const access = await userSystemAccessRepository.findActiveGrant(userId, systemId);
  if (!access) {
    throw new TokenAccessDeniedError();
  }
  return { user, access };
}

async function exchangeAuthorizationCode(input: TokenRequestDTO, ip: string | undefined): Promise<TokenResponseDTO> {
  const parsed = AuthorizationCodeGrantFieldsSchema.safeParse({
    code: input.code,
    redirectUri: input.redirectUri,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
  });
  if (!parsed.success) {
    throw new OAuthRequestValidationError();
  }
  const { code, redirectUri, clientId, clientSecret } = parsed.data;

  // Autenticacao do SISTEMA cliente (diferente da autenticacao do
  // usuario, feita no /login da OS 02).
  const system = await systemRepository.findByClientId(clientId);
  if (!system || !system.active || !matchesHash(clientSecret, system.clientSecretHash)) {
    throw new ClientAuthenticationError();
  }

  const authCode = await authorizationCodeRepository.findByCode(code);
  if (!authCode || authCode.systemId !== system.id) {
    throw new InvalidGrantError();
  }

  if (authCode.expiresAt.getTime() < Date.now()) {
    throw new InvalidGrantError("code expirado");
  }

  if (authCode.usedAt) {
    // Reuso de code = sinal de comprometimento (interceptacao ou
    // duplicacao), nao um erro trivial. Revoga preventivamente qualquer
    // refresh token ativo desse usuario nesse sistema.
    await refreshTokenRepository.revokeAllActiveForUserAndSystem(authCode.userId, authCode.systemId);
    await auditLogRepository.create({
      action: "ACCESS_REVOKED",
      userId: authCode.userId,
      systemId: authCode.systemId,
      metadata: { ip, reason: "authorization_code_reuse_detected" },
    });
    throw new InvalidGrantError("code ja utilizado");
  }

  if (authCode.redirectUri !== redirectUri) {
    throw new InvalidGrantError("redirect_uri nao confere");
  }

  const { user, access } = await loadActiveAccessOrThrow(authCode.userId, authCode.systemId);

  // Uso unico: so marca como usado depois de todas as validacoes acima
  // passarem.
  await authorizationCodeRepository.markUsed(authCode.id);

  // Emissao inicial - comeca uma linhagem nova de refresh tokens.
  const { accessToken, refreshToken } = await issueTokenPair(user, system, access.role.name, randomUUID());

  await auditLogRepository.create({
    action: "TOKEN_ISSUED",
    userId: user.id,
    systemId: system.id,
    metadata: { ip, grantType: "authorization_code" },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
}

async function exchangeRefreshToken(input: TokenRequestDTO, ip: string | undefined): Promise<TokenResponseDTO> {
  const parsed = RefreshTokenGrantFieldsSchema.safeParse({
    refreshToken: input.refreshToken,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
  });
  if (!parsed.success) {
    throw new OAuthRequestValidationError();
  }
  const { refreshToken, clientId, clientSecret } = parsed.data;

  const system = await systemRepository.findByClientId(clientId);
  if (!system || !system.active || !matchesHash(clientSecret, system.clientSecretHash)) {
    throw new ClientAuthenticationError();
  }

  const stored = await refreshTokenRepository.findByTokenHash(sha256Hex(refreshToken));
  if (!stored || stored.systemId !== system.id) {
    throw new InvalidGrantError();
  }

  if (stored.revokedAt) {
    // Um refresh token so fica revogado por ja ter sido usado (rotacao) ou
    // por revogacao explicita - em qualquer caso, ve-lo de volta e sinal de
    // comprometimento (alguem tem uma copia de um token que ja deveria
    // estar morto). Revoga a linhagem INTEIRA, nao so este token.
    await refreshTokenRepository.revokeFamily(stored.familyId);
    await auditLogRepository.create({
      action: "ACCESS_REVOKED",
      userId: stored.userId,
      systemId: stored.systemId,
      metadata: { ip, reason: "refresh_token_reuse_detected" },
    });
    throw new InvalidGrantError("refresh token ja utilizado");
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw new InvalidGrantError("refresh token expirado");
  }

  // Revoga o token atual ANTES de emitir o proximo - se o usuario perdeu o
  // acesso ao sistema nesse meio-tempo, loadActiveAccessOrThrow lanca e a
  // rotacao para aqui (efeito pratico: revogar UserSystemAccess impede
  // renovacao futura, mesmo sem invalidar um access_token ja emitido -
  // limitacao documentada do modelo JWT, OS 06 secao 5).
  await refreshTokenRepository.revoke(stored.id);

  const { user, access } = await loadActiveAccessOrThrow(stored.userId, stored.systemId);

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
    user,
    system,
    access.role.name,
    stored.familyId
  );

  await auditLogRepository.create({
    action: "TOKEN_ISSUED",
    userId: user.id,
    systemId: system.id,
    metadata: { ip, grantType: "refresh_token" },
  });

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export const oauthService = {
  async authorize(input: AuthorizeInputDTO, ip: string | undefined): Promise<AuthorizeDecision> {
    const { clientId, redirectUri, responseType } = input;

    if (!clientId) {
      return { kind: "invalid_request", body: { error: "invalid_request", error_description: "client_id e obrigatorio" } };
    }

    const system = await systemRepository.findByClientId(clientId);
    if (!system || !system.active) {
      return { kind: "invalid_request", body: { error: "invalid_client" } };
    }

    // Comparacao EXATA contra a lista registrada - nunca prefixo/regex. E o
    // ponto mais comum de vulnerabilidade em implementacoes caseiras de
    // OAuth2 (OS 03, secao 4) - por isso nada aqui e redirecionado antes
    // dessa checagem passar.
    if (!redirectUri || !system.redirectUris.includes(redirectUri)) {
      return { kind: "invalid_request", body: { error: "invalid_redirect_uri" } };
    }

    // A partir daqui redirect_uri e confiavel - erros seguintes voltam pro
    // cliente via redirect com `error=...` (padrao OAuth2), nunca via JSON.
    if (responseType !== "code") {
      return { kind: "redirect_error", redirectUri, error: "unsupported_response_type" };
    }

    if (!input.sessionUserId) {
      return { kind: "need_login", destroySession: false };
    }

    const user = await userRepository.findById(input.sessionUserId);
    if (!user || !user.active) {
      return { kind: "need_login", destroySession: true };
    }

    if (user.mustChangePassword) {
      return { kind: "need_password_change" };
    }

    const access = await userSystemAccessRepository.findActiveGrant(user.id, system.id);
    if (!access) {
      return {
        kind: "redirect_error",
        redirectUri,
        error: "access_denied",
        description: "Usuario sem acesso a este sistema",
      };
    }

    const code = randomBytes(32).toString("base64url");
    await authorizationCodeRepository.create({
      code,
      userId: user.id,
      systemId: system.id,
      redirectUri,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    });

    await auditLogRepository.create({
      action: "SYSTEM_ACCESS",
      userId: user.id,
      systemId: system.id,
      metadata: { ip, redirectUri },
    });

    return { kind: "success", redirectUri, code };
  },

  exchangeToken(input: TokenRequestDTO, ip: string | undefined): Promise<TokenResponseDTO> {
    if (input.grantType === "authorization_code") {
      return exchangeAuthorizationCode(input, ip);
    }
    if (input.grantType === "refresh_token") {
      return exchangeRefreshToken(input, ip);
    }
    throw new UnsupportedGrantTypeError();
  },

  async revokeToken(input: RevokeRequestDTO, ip: string | undefined): Promise<void> {
    const parsed = RevokeRequestFieldsSchema.safeParse(input);
    if (!parsed.success) {
      throw new OAuthRequestValidationError();
    }
    const { token, clientId, clientSecret } = parsed.data;

    const system = await systemRepository.findByClientId(clientId);
    if (!system || !system.active || !matchesHash(clientSecret, system.clientSecretHash)) {
      throw new ClientAuthenticationError();
    }

    // RFC 7009: o endpoint de revogacao nunca revela se o token existia,
    // ja era invalido, ou pertencia a outro cliente - sempre "sucesso" do
    // ponto de vista de quem chamou, silenciosamente sem-efeito nesses casos.
    const stored = await refreshTokenRepository.findByTokenHash(sha256Hex(token));
    if (!stored || stored.systemId !== system.id || stored.revokedAt) {
      return;
    }

    await refreshTokenRepository.revoke(stored.id);

    await auditLogRepository.create({
      action: "LOGOUT",
      userId: stored.userId,
      systemId: stored.systemId,
      metadata: { ip },
    });
  },

  // RP-Initiated Logout (segue GET /session/end): valida client_id e onde
  // o navegador pode ser mandado de volta apos o IdP encerrar a sessao
  // dele. Match EXATO contra postLogoutRedirectUris - campo proprio,
  // separado de redirectUris (que e so o /auth/callback OAuth) - porque um
  // sistema pode ter frontend e backend em origens diferentes, e o destino
  // pos-logout normalmente e o frontend. Mesma politica de seguranca ja
  // usada em /authorize (OS 03): nunca aceitar por prefixo/origem, sempre
  // contra a lista cadastrada.
  async resolveEndSessionRedirect(
    clientId: string | undefined,
    postLogoutRedirectUri: string | undefined
  ): Promise<string> {
    if (!clientId) {
      throw new UnknownClientError();
    }
    const system = await systemRepository.findByClientId(clientId);
    if (!system || !system.active) {
      throw new UnknownClientError();
    }

    if (!postLogoutRedirectUri || !system.postLogoutRedirectUris.includes(postLogoutRedirectUri)) {
      throw new InvalidRedirectUriError();
    }

    return postLogoutRedirectUri;
  },
};
