import type { Role, System, UserSystemAccess } from "@prisma/client";
import { prisma } from "../prisma/client";

export interface ActiveAccessWithRole extends UserSystemAccess {
  role: Role;
}

export interface AccessWithSystemAndRole extends UserSystemAccess {
  role: Role;
  system: System;
}

const WITH_SYSTEM_AND_ROLE = { role: true, system: true } as const;

export const userSystemAccessRepository = {
  findActiveGrant(userId: string, systemId: string): Promise<ActiveAccessWithRole | null> {
    return prisma.userSystemAccess.findFirst({
      where: { userId, systemId, revokedAt: null },
      include: { role: true },
    });
  },

  findById(id: string): Promise<UserSystemAccess | null> {
    return prisma.userSystemAccess.findUnique({ where: { id } });
  },

  // So os acessos ATIVOS de um usuario (OS 06, tela de detalhe do usuario:
  // "Este usuario tem acesso a: Farol [gerente], Sistema X [comum]").
  findActiveForUser(userId: string): Promise<AccessWithSystemAndRole[]> {
    return prisma.userSystemAccess.findMany({
      where: { userId, revokedAt: null },
      include: WITH_SYSTEM_AND_ROLE,
      orderBy: { grantedAt: "desc" },
    });
  },

  create(data: {
    userId: string;
    systemId: string;
    roleId: string;
    grantedById: string;
  }): Promise<AccessWithSystemAndRole> {
    return prisma.userSystemAccess.create({ data, include: WITH_SYSTEM_AND_ROLE });
  },

  revoke(id: string): Promise<UserSystemAccess> {
    return prisma.userSystemAccess.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  // Troca de papel = revoga o acesso atual e cria um novo, atomicamente
  // (OS 06, 3.1) - mantem o historico intacto, como modelado na OS 01.
  // Retorna null se o acesso nao existir ou ja estiver revogado (quem
  // chama decide qual erro de dominio isso vira).
  changeRole(accessId: string, newRoleId: string, performedById: string): Promise<AccessWithSystemAndRole | null> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.userSystemAccess.findUnique({ where: { id: accessId } });
      if (!current || current.revokedAt) {
        return null;
      }

      await tx.userSystemAccess.update({ where: { id: accessId }, data: { revokedAt: new Date() } });

      return tx.userSystemAccess.create({
        data: {
          userId: current.userId,
          systemId: current.systemId,
          roleId: newRoleId,
          grantedById: performedById,
        },
        include: WITH_SYSTEM_AND_ROLE,
      });
    });
  },
};
