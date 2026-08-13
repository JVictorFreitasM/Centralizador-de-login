import { Router } from "express";
import { auditLogController } from "../controllers/auditLog.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: "[Admin/TI] Lista logs de auditoria (paginado, filtravel)"
 *     description: Somente leitura de proposito - nao existe POST/PATCH/DELETE de log em lugar nenhum da API.
 *     tags: [Auditoria (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: systemId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SYSTEM_ACCESS, ACCESS_GRANTED, ACCESS_REVOKED, USER_CREATED, USER_UPDATED, PASSWORD_CHANGED, TOKEN_ISSUED]
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Lista paginada de eventos de auditoria
 */
auditLogRouter.get("/", auditLogController.list);
