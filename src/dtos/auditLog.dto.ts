import { z } from "zod";
import { AuditAction } from "@prisma/client";

// Query string - shape/formato mesmo (page/limit numericos, action dentro
// do enum, datas validas), por isso zod cabe bem aqui (diferente do
// /authorize da OS 03, que e tudo regra de negocio).
export const AuditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    userId: z.string().min(1).optional(),
    systemId: z.string().min(1).optional(),
    action: z.nativeEnum(AuditAction).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strip();
export type AuditLogQueryDTO = z.infer<typeof AuditLogQuerySchema>;

export interface AuditLogResponseDTO {
  id: string;
  action: AuditAction;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  systemId: string | null;
  systemName: string | null;
  systemSlug: string | null;
  metadata: unknown;
  createdAt: Date;
}
