import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreateUserSchema = z
  .object({
    name: z
      .string({ required_error: "Nome e obrigatorio", invalid_type_error: "Nome e obrigatorio" })
      .refine((value) => value.trim().length > 0, "Nome e obrigatorio")
      .transform((value) => value.trim()),
    email: z
      .string({ required_error: "E-mail invalido", invalid_type_error: "E-mail invalido" })
      .refine((value) => EMAIL_REGEX.test(value), "E-mail invalido")
      .transform((value) => value.trim().toLowerCase()),
  })
  .strip();
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

export const UpdateUserActiveSchema = z
  .object({
    active: z.boolean({
      required_error: "Campo 'active' (boolean) e obrigatorio",
      invalid_type_error: "Campo 'active' (boolean) e obrigatorio",
    }),
  })
  .strip();
export type UpdateUserActiveDTO = z.infer<typeof UpdateUserActiveSchema>;

// Formatos de resposta espelham exatamente os das rotas originais (OS 02) -
// cada endpoint historicamente devolve um subconjunto diferente de campos,
// nunca passwordHash.
export interface CreateUserResponseDTO {
  id: string;
  name: string;
  email: string;
  tempPassword: string;
}

export interface SetUserActiveResponseDTO {
  id: string;
  email: string;
  active: boolean;
}

export interface ResetPasswordResponseDTO {
  id: string;
  email: string;
  tempPassword: string;
}

// OS 06, tela de Usuarios: listagem paginada, busca por nome ou e-mail.
export const ListUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().optional(),
  })
  .strip();
export type ListUsersQueryDTO = z.infer<typeof ListUsersQuerySchema>;

export interface UserListItemDTO {
  id: string;
  name: string;
  email: string;
  active: boolean;
  mustChangePassword: boolean;
  isTI: boolean;
  createdAt: Date;
}
