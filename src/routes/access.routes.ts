import { Router } from "express";
import { accessController } from "../controllers/access.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const accessRouter = Router();

accessRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

accessRouter.post("/", accessController.grant);
accessRouter.post("/:id/revoke", accessController.revoke);
accessRouter.patch("/:id/role", accessController.changeRole);
