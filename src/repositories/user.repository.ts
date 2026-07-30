import type { Prisma, User } from "@prisma/client";
import { prisma } from "../prisma/client";

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  // Busca por nome OU e-mail (case-insensitive), paginada - OS 06, tela de
  // Usuarios.
  async findMany(params: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput | undefined = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    mustChangePassword: boolean;
    createdById?: string;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  update(
    id: string,
    data: Partial<Pick<User, "active" | "passwordHash" | "mustChangePassword">>
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};
