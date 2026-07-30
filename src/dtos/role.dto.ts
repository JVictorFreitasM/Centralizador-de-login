import { z } from "zod";

export const CreateRoleSchema = z
  .object({
    name: z
      .string({ required_error: "Nome do papel e obrigatorio", invalid_type_error: "Nome do papel e obrigatorio" })
      .refine((value) => value.trim().length > 0, "Nome do papel e obrigatorio")
      .transform((value) => value.trim()),
    description: z.string().trim().optional(),
  })
  .strip();
export type CreateRoleDTO = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z
  .object({
    name: z.string().min(1, "Nome do papel e obrigatorio").transform((value) => value.trim()).optional(),
    description: z.string().trim().optional(),
  })
  .strip();
export type UpdateRoleDTO = z.infer<typeof UpdateRoleSchema>;

export interface RoleResponseDTO {
  id: string;
  systemId: string;
  name: string;
  description: string | null;
}
