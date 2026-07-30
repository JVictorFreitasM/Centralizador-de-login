import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

const WITH_USER_AND_SYSTEM = {
  user: { select: { name: true, email: true } },
  system: { select: { name: true, slug: true } },
} as const;

export type AuditLogWithNames = Prisma.AuditLogGetPayload<{ include: typeof WITH_USER_AND_SYSTEM }>;

export const auditLogRepository = {
  create(params: {
    action: AuditAction;
    userId?: string | null;
    systemId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId ?? null,
        systemId: params.systemId ?? null,
        metadata: params.metadata,
      },
    });
  },

  // Listagem paginada com filtros - OS 06, tela de Auditoria (so leitura).
  async findMany(params: {
    userId?: string;
    systemId?: string;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  }): Promise<{ items: AuditLogWithNames[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      userId: params.userId,
      systemId: params.systemId,
      action: params.action,
      createdAt:
        params.from || params.to
          ? { gte: params.from, lte: params.to }
          : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: WITH_USER_AND_SYSTEM,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },
};
