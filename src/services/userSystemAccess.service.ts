import { userRepository } from "../repositories/user.repository";
import { systemRepository } from "../repositories/system.repository";
import { roleRepository } from "../repositories/role.repository";
import { userSystemAccessRepository, type AccessWithSystemAndRole } from "../repositories/userSystemAccess.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import type { ChangeAccessRoleDTO, GrantAccessDTO, UserSystemAccessResponseDTO } from "../dtos/userSystemAccess.dto";
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

export const userSystemAccessService = {
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
