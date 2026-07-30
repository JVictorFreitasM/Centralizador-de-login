import { auditLogRepository, type AuditLogWithNames } from "../repositories/auditLog.repository";
import type { AuditLogQueryDTO, AuditLogResponseDTO } from "../dtos/auditLog.dto";
import type { PaginatedResponseDTO } from "../dtos/common.dto";

function toAuditLogResponseDTO(log: AuditLogWithNames): AuditLogResponseDTO {
  return {
    id: log.id,
    action: log.action,
    userId: log.userId,
    userName: log.user?.name ?? null,
    userEmail: log.user?.email ?? null,
    systemId: log.systemId,
    systemName: log.system?.name ?? null,
    systemSlug: log.system?.slug ?? null,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}

export const auditLogService = {
  async listAuditLogs(query: AuditLogQueryDTO): Promise<PaginatedResponseDTO<AuditLogResponseDTO>> {
    const { items, total } = await auditLogRepository.findMany(query);

    return {
      data: items.map(toAuditLogResponseDTO),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },
};
