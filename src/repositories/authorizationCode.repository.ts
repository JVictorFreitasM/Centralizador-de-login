import type { AuthorizationCode } from "@prisma/client";
import { prisma } from "../prisma/client";

export const authorizationCodeRepository = {
  create(data: {
    code: string;
    userId: string;
    systemId: string;
    redirectUri: string;
    expiresAt: Date;
  }): Promise<AuthorizationCode> {
    return prisma.authorizationCode.create({ data });
  },

  findByCode(code: string): Promise<AuthorizationCode | null> {
    return prisma.authorizationCode.findUnique({ where: { code } });
  },

  markUsed(id: string): Promise<AuthorizationCode> {
    return prisma.authorizationCode.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
