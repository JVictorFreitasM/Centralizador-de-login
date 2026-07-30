import { Router } from "express";
import { auditLogController } from "../controllers/auditLog.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

// So GET nesta rota - tela de auditoria e somente leitura, de proposito
// (OS 06, secao 5).
auditLogRouter.get("/", auditLogController.list);
