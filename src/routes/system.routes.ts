import { Router } from "express";
import { systemController } from "../controllers/system.controller";
import { roleController } from "../controllers/role.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const systemRouter = Router();

systemRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

systemRouter.get("/", systemController.list);
systemRouter.post("/", systemController.create);
systemRouter.patch("/:id", systemController.update);
systemRouter.post("/:id/regenerate-secret", systemController.regenerateSecret);

// Papeis vividos dentro do namespace do sistema (OS 06, 3.3 - "Papeis do
// Farol: comum, gerente, admin").
systemRouter.get("/:systemId/roles", roleController.listForSystem);
systemRouter.post("/:systemId/roles", roleController.create);
