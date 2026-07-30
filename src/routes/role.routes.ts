import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const roleRouter = Router();

roleRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

// Editar/remover um papel ja identificado pelo proprio id nao precisa do
// systemId no path (diferente de listar/criar, aninhados em /systems/:id/roles).
roleRouter.patch("/:id", roleController.update);
roleRouter.delete("/:id", roleController.remove);
