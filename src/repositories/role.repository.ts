import type { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

export const roleRepository = {
  findById(id: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id } });
  },

  findBySystemAndName(systemId: string, name: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { systemId_name: { systemId, name } } });
  },

  findBySystemId(systemId: string): Promise<Role[]> {
    return prisma.role.findMany({ where: { systemId }, orderBy: { name: "asc" } });
  },

  create(data: { systemId: string; name: string; description?: string }): Promise<Role> {
    return prisma.role.create({ data });
  },

  update(id: string, data: Partial<Pick<Role, "name" | "description">>): Promise<Role> {
    return prisma.role.update({ where: { id }, data });
  },

  // Role nao esta na lista de "nunca deletar fisicamente" da OS 01 (so
  // User/System/UserSystemAccess estao) - remocao de papel e delete real.
  // Se estiver em uso por algum UserSystemAccess, a FK (ON DELETE RESTRICT)
  // rejeita e quem chama trata o erro (ver role.service.ts).
  delete(id: string): Promise<Role> {
    return prisma.role.delete({ where: { id } });
  },
};
