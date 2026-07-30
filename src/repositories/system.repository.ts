import type { System } from "@prisma/client";
import { prisma } from "../prisma/client";

export const systemRepository = {
  findByClientId(clientId: string): Promise<System | null> {
    return prisma.system.findUnique({ where: { clientId } });
  },

  findById(id: string): Promise<System | null> {
    return prisma.system.findUnique({ where: { id } });
  },

  findBySlug(slug: string): Promise<System | null> {
    return prisma.system.findUnique({ where: { slug } });
  },

  findAll(): Promise<System[]> {
    return prisma.system.findMany({ orderBy: { name: "asc" } });
  },

  create(data: {
    name: string;
    slug: string;
    clientId: string;
    clientSecretHash: string;
    redirectUris: string[];
  }): Promise<System> {
    return prisma.system.create({ data });
  },

  update(
    id: string,
    data: Partial<Pick<System, "name" | "redirectUris" | "active">>
  ): Promise<System> {
    return prisma.system.update({ where: { id }, data });
  },

  updateSecretHash(id: string, clientSecretHash: string): Promise<System> {
    return prisma.system.update({ where: { id }, data: { clientSecretHash } });
  },
};
