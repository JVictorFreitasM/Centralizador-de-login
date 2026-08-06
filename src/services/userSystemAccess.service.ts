import { userRepository } from "../repositories/user.repository";
import { systemRepository } from "../repositories/system.repository";
import { roleRepository } from "../repositories/role.repository";
import { userSystemAccessRepository, type AccessWithSystemAndRole } from "../repositories/userSystemAccess.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import type { ChangeAccessRoleDTO, GrantAccessDTO, MeSystemDTO, UserSystemAccessResponseDTO } from "../dtos/userSystemAccess.dto";
import {
  AccessAlreadyGrantedError,
  AccessAlreadyRevokedError,
  AccessNotFoundError,
  RoleBelongsToOtherSystemError,
  RoleNotFoundError,
  SystemNotFoundError,
  UserNotFoundError,
} from "../errors/domain.errors";
import { isUniqueConstraintError } from "../lib/prismaErrors";

function toAccessResponseDTO(access: AccessWithSystemAndRole): UserSystemAccessResponseDTO {
  return {
    id: access.id,
    userId: access.userId,
    systemId: access.systemId,
    systemName: access.system.name,
    systemSlug: access.system.slug,
    roleId: access.roleId,
    roleName: access.role.name,
    grantedById: access.grantedById,
    grantedAt: access.grantedAt,
    revokedAt: access.revokedAt,
  };
}

// Aponta pro /auth/login do PROPRIO sistema cliente, nao direto pro
// /authorize do IdP - o /auth/login e quem gera e guarda o `state`
// anti-CSRF (Client SDK, OS 07) antes de redirecionar pro /authorize; sem
// passar por ele, o /auth/callback do sistema rejeita o login com "Estado
// invalido ou expirado", mesmo a sessao do IdP sendo valida.
//
// OS 07-B: usar so a ORIGEM do redirect_uri quebra sistemas montados sob um
// prefixo (ex.: Farol, atras do proxy /api do Vite: redirect_uri termina em
// "/api/auth/callback", nao em "/auth/callback" na raiz) - o loginUrl
// resultante ficava "http://host/auth/login" em vez de
// "http://host/api/auth/login", um path que o sistema nem serve. Em vez
// disso, deriva do PATH COMPLETO: troca o sufixo "/auth/callback" (convencao
// do callbackPath default do Client SDK) por "/auth/login" (idem loginPath),
// preservando qualquer prefixo antes dele. Sistemas que customizam esses
// paths no createIdpAuth precisam ser ajustados aqui tambem.
const DEFAULT_CALLBACK_SUFFIX = "/auth/callback";
const DEFAULT_LOGIN_SUFFIX = "/auth/login";

function buildLoginUrl(system: AccessWithSystemAndRole["system"]): string {
  const redirectUri = new URL(system.redirectUris[0]);
  const prefix = redirectUri.pathname.endsWith(DEFAULT_CALLBACK_SUFFIX)
    ? redirectUri.pathname.slice(0, -DEFAULT_CALLBACK_SUFFIX.length)
    : "";
  return `${redirectUri.origin}${prefix}${DEFAULT_LOGIN_SUFFIX}`;
}

function toMeSystemDTO(access: AccessWithSystemAndRole): MeSystemDTO {
  return {
    systemId: access.systemId,
    name: access.system.name,
    slug: access.system.slug,
    role: access.role.name,
    loginUrl: buildLoginUrl(access.system),
  };
}

export const userSystemAccessService = {
  // OS 13: visao do PROPRIO usuario sobre seus acessos - so sistemas
  // ativos, so acessos ativos, nunca aceita um userId alheio (quem chama
  // sempre passa o id da propria sessao, nunca um parametro de rota).
  async listSystemsForCurrentUser(userId: string): Promise<MeSystemDTO[]> {
    const accesses = await userSystemAccessRepository.findActiveForUser(userId);
    return accesses.filter((access) => access.system.active).map(toMeSystemDTO);
  },

  async listAccessForUser(userId: string): Promise<UserSystemAccessResponseDTO[]> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const accesses = await userSystemAccessRepository.findActiveForUser(userId);
    return accesses.map(toAccessResponseDTO);
  },

  async grantAccess(dto: GrantAccessDTO, performedById: string): Promise<UserSystemAccessResponseDTO> {
    const [user, system, role] = await Promise.all([
      userRepository.findById(dto.userId),
      systemRepository.findById(dto.systemId),
      roleRepository.findById(dto.roleId),
    ]);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (!system) {
      throw new SystemNotFoundError();
    }
    if (!role) {
      throw new RoleNotFoundError();
    }
    if (role.systemId !== dto.systemId) {
      throw new RoleBelongsToOtherSystemError();
    }

    const existingActive = await userSystemAccessRepository.findActiveGrant(dto.userId, dto.systemId);
    if (existingActive) {
      throw new AccessAlreadyGrantedError();
    }

    try {
      const created = await userSystemAccessRepository.create({
        userId: dto.userId,
        systemId: dto.systemId,
        roleId: dto.roleId,
        grantedById: performedById,
      });

      await auditLogRepository.create({
        action: "ACCESS_GRANTED",
        userId: created.userId,
        systemId: created.systemId,
        metadata: { performedBy: performedById, roleId: created.roleId },
      });

      return toAccessResponseDTO(created);
    } catch (err) {
      // Backstop contra corrida com o indice unico parcial da OS 01
      // (um acesso ativo por usuario/sistema) - o check acima cobre o
      // caso comum, isto cobre a janela entre o findActiveGrant e o create.
      if (isUniqueConstraintError(err)) {
        throw new AccessAlreadyGrantedError();
      }
      throw err;
    }
  },

  async revokeAccess(accessId: string, performedById: string): Promise<void> {
    const existing = await userSystemAccessRepository.findById(accessId);
    if (!existing) {
      throw new AccessNotFoundError();
    }
    if (existing.revokedAt) {
      throw new AccessAlreadyRevokedError();
    }

    await userSystemAccessRepository.revoke(accessId);

    await auditLogRepository.create({
      action: "ACCESS_REVOKED",
      userId: existing.userId,
      systemId: existing.systemId,
      metadata: { performedBy: performedById },
    });
  },

  // Troca de papel = revoga o acesso atual e cria um novo (OS 06, 3.1),
  // preservando o historico via dois AuditLog separados.
  async changeAccessRole(
    accessId: string,
    dto: ChangeAccessRoleDTO,
    performedById: string
  ): Promise<UserSystemAccessResponseDTO> {
    const current = await userSystemAccessRepository.findById(accessId);
    if (!current) {
      throw new AccessNotFoundError();
    }
    if (current.revokedAt) {
      throw new AccessAlreadyRevokedError();
    }

    const newRole = await roleRepository.findById(dto.roleId);
    if (!newRole) {
      throw new RoleNotFoundError();
    }
    if (newRole.systemId !== current.systemId) {
      throw new RoleBelongsToOtherSystemError();
    }

    const result = await userSystemAccessRepository.changeRole(accessId, dto.roleId, performedById);
    if (!result) {
      // Foi revogado entre a checagem acima e a transacao.
      throw new AccessAlreadyRevokedError();
    }

    await auditLogRepository.create({
      action: "ACCESS_REVOKED",
      userId: current.userId,
      systemId: current.systemId,
      metadata: { performedBy: performedById, reason: "role_changed", previousRoleId: current.roleId },
    });
    await auditLogRepository.create({
      action: "ACCESS_GRANTED",
      userId: result.userId,
      systemId: result.systemId,
      metadata: { performedBy: performedById, roleId: result.roleId, reason: "role_changed" },
    });

    return toAccessResponseDTO(result);
  },
};
