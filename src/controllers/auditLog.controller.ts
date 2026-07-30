import { asyncHandler } from "../lib/asyncHandler";
import { AuditLogQuerySchema } from "../dtos/auditLog.dto";
import { parseOrThrow } from "../lib/validate";
import { auditLogService } from "../services/auditLog.service";

export const auditLogController = {
  // Somente leitura de proposito (OS 06, secao 5) - so existe este handler
  // GET nesta rota, nenhum POST/PATCH/DELETE de log em lugar nenhum.
  list: asyncHandler(async (req, res) => {
    const query = parseOrThrow(AuditLogQuerySchema, req.query ?? {});
    const result = await auditLogService.listAuditLogs(query);
    res.json(result);
  }),
};
