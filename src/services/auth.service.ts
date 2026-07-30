import type { User } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { hashPassword, verifyPassword } from "../lib/password";
import type { LoginDTO, PasswordChangeDTO } from "../dtos/auth.dto";
import { IncorrectPasswordError, InvalidCredentialsError } from "../errors/domain.errors";

export const authService = {
  // Retorna o usuario autenticado ou lanca InvalidCredentialsError - a
  // mensagem generica (OS 02: nunca revelar se o problema foi e-mail ou
  // senha) e responsabilidade do proprio erro, nao de quem chama.
  async login(dto: LoginDTO, ip: string | undefined): Promise<User> {
    const user = await userRepository.findByEmail(dto.email);
    const passwordMatches = user ? await verifyPassword(dto.password, user.passwordHash) : false;

    if (!user || !user.active || !passwordMatches) {
      await auditLogRepository.create({
        action: "LOGIN_FAILED",
        userId: user?.id ?? null,
        metadata: { ip, email: dto.email },
      });
      throw new InvalidCredentialsError();
    }

    await auditLogRepository.create({ action: "LOGIN_SUCCESS", userId: user.id, metadata: { ip } });
    return user;
  },

  async logout(userId: string, ip: string | undefined): Promise<void> {
    await auditLogRepository.create({ action: "LOGOUT", userId, metadata: { ip } });
  },

  async changePassword(user: User, dto: PasswordChangeDTO, ip: string | undefined): Promise<void> {
    const currentMatches = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new IncorrectPasswordError();
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await userRepository.update(user.id, { passwordHash, mustChangePassword: false });

    await auditLogRepository.create({ action: "PASSWORD_CHANGED", userId: user.id, metadata: { ip } });
  },
};
