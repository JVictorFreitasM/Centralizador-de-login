import { roleRepository } from "../repositories/role.repository";
import { systemRepository } from "../repositories/system.repository";
import type { CreateRoleDTO, RoleResponseDTO, UpdateRoleDTO } from "../dtos/role.dto";
import { RoleAlreadyExistsError, RoleInUseError, RoleNotFoundError, SystemNotFoundError } from "../errors/domain.errors";
import { isForeignKeyConstraintError, isUniqueConstraintError } from "../lib/prismaErrors";

function toRoleResponseDTO(role: { id: string; systemId: string; name: string; description: string | null }): RoleResponseDTO {
  return { id: role.id, systemId: role.systemId, name: role.name, description: role.description };
}

export const roleService = {
  async listRolesForSystem(systemId: string): Promise<RoleResponseDTO[]> {
    const system = await systemRepository.findById(systemId);
    if (!system) {
      throw new SystemNotFoundError();
    }

    const roles = await roleRepository.findBySystemId(systemId);
    return roles.map(toRoleResponseDTO);
  },

  async createRole(systemId: string, dto: CreateRoleDTO): Promise<RoleResponseDTO> {
    const system = await systemRepository.findById(systemId);
    if (!system) {
      throw new SystemNotFoundError();
    }

    try {
      const role = await roleRepository.create({ systemId, name: dto.name, description: dto.description });
      return toRoleResponseDTO(role);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new RoleAlreadyExistsError();
      }
      throw err;
    }
  },

  async updateRole(id: string, dto: UpdateRoleDTO): Promise<RoleResponseDTO> {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new RoleNotFoundError();
    }

    try {
      const updated = await roleRepository.update(id, dto);
      return toRoleResponseDTO(updated);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new RoleAlreadyExistsError();
      }
      throw err;
    }
  },

  async deleteRole(id: string): Promise<void> {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new RoleNotFoundError();
    }

    try {
      await roleRepository.delete(id);
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        throw new RoleInUseError();
      }
      throw err;
    }
  },
};
