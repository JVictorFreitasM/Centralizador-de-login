import { z } from "zod";

const REQUIRED_ID = { required_error: "Campo obrigatorio", invalid_type_error: "Campo obrigatorio" };

export const GrantAccessSchema = z
  .object({
    userId: z.string(REQUIRED_ID).min(1, "Campo obrigatorio"),
    systemId: z.string(REQUIRED_ID).min(1, "Campo obrigatorio"),
    roleId: z.string(REQUIRED_ID).min(1, "Campo obrigatorio"),
  })
  .strip();
export type GrantAccessDTO = z.infer<typeof GrantAccessSchema>;

export const ChangeAccessRoleSchema = z
  .object({
    roleId: z.string(REQUIRED_ID).min(1, "Campo obrigatorio"),
  })
  .strip();
export type ChangeAccessRoleDTO = z.infer<typeof ChangeAccessRoleSchema>;

export interface UserSystemAccessResponseDTO {
  id: string;
  userId: string;
  systemId: string;
  systemName: string;
  systemSlug: string;
  roleId: string;
  roleName: string;
  grantedById: string;
  grantedAt: Date;
  revokedAt: Date | null;
}
