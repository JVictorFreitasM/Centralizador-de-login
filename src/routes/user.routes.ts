import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { accessController } from "../controllers/access.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const userRouter = Router();

// Toda rota de gestao de usuario exige sessao valida, ser TI, e ja ter
// trocado a senha temporaria (nao dá pra administrar outros usuarios
// enquanto a propria conta ainda esta com senha provisoria).
userRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

userRouter.get("/", userController.list);
userRouter.post("/", userController.create);
userRouter.patch("/:id", userController.setActive);
userRouter.post("/:id/reset-password", userController.resetPassword);

// Acessos concedidos a este usuario (OS 06, tela de detalhe do usuario).
userRouter.get("/:userId/access", accessController.listForUser);
