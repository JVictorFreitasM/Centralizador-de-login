import type { RefreshToken } from "@prisma/client";
import { prisma } from "../prisma/client";

export const refreshTokenRepository = {
  create(data: {
    userId: string;
    systemId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revoke(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  // Reuso de refresh token (um token ja revogado sendo apresentado de novo)
  // e sinal de comprometimento - revoga a linhagem INTEIRA (mesma familyId),
  // nao so o token apresentado (OS 04, espelhando a mesma logica ja usada
  // pra reuso de authorization code na OS 03).
  async revokeFamily(familyId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  async revokeAllActiveForUserAndSystem(userId: string, systemId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, systemId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },
};
