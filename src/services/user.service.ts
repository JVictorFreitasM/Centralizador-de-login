import { userRepository } from "../repositories/user.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { generateTempPassword, hashPassword } from "../lib/password";
import type {
  CreateUserDTO,
  CreateUserResponseDTO,
  ListUsersQueryDTO,
  ResetPasswordResponseDTO,
  SetUserActiveResponseDTO,
  UserListItemDTO,
} from "../dtos/user.dto";
import type { PaginatedResponseDTO } from "../dtos/common.dto";
import { EmailAlreadyExistsError, UserNotFoundError } from "../errors/domain.errors";

function toUserListItemDTO(user: {
  id: string;
  name: string;
  email: string;
  active: boolean;
  mustChangePassword: boolean;
  isTI: boolean;
  createdAt: Date;
}): UserListItemDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    isTI: user.isTI,
    createdAt: user.createdAt,
  };
}

export const userService = {
  async listUsers(query: ListUsersQueryDTO): Promise<PaginatedResponseDTO<UserListItemDTO>> {
    const { items, total } = await userRepository.findMany(query);

    return {
      data: items.map(toUserListItemDTO),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async createUser(dto: CreateUserDTO, createdById: string, ip: string | undefined): Promise<CreateUserResponseDTO> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      mustChangePassword: true,
      createdById,
    });

    await auditLogRepository.create({
      action: "USER_CREATED",
      userId: user.id,
      metadata: { performedBy: createdById, ip },
    });

    return { id: user.id, name: user.name, email: user.email, tempPassword };
  },

  async setActive(id: string, active: boolean, performedById: string, ip: string | undefined): Promise<SetUserActiveResponseDTO> {
    const target = await userRepository.findById(id);
    if (!target) {
      throw new UserNotFoundError();
    }

    const updated = await userRepository.update(id, { active });

    await auditLogRepository.create({
      action: "USER_UPDATED",
      userId: updated.id,
      metadata: { performedBy: performedById, ip, change: "active", value: active },
    });

    return { id: updated.id, email: updated.email, active: updated.active };
  },

  async resetPassword(id: string, performedById: string, ip: string | undefined): Promise<ResetPasswordResponseDTO> {
    const target = await userRepository.findById(id);
    if (!target) {
      throw new UserNotFoundError();
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await userRepository.update(id, { passwordHash, mustChangePassword: true });

    await auditLogRepository.create({
      action: "USER_UPDATED",
      userId: target.id,
      metadata: { performedBy: performedById, ip, change: "password_reset" },
    });

    return { id: target.id, email: target.email, tempPassword };
  },
};
