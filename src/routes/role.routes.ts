import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const roleRouter = Router();

roleRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

/**
 * @swagger
 * /roles/{id}:
 *   patch:
 *     summary: "[Admin/TI] Renomeia/edita a descricao de um papel"
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Role atualizada
 *       404:
 *         description: Role nao encontrada
 */
roleRouter.patch("/:id", roleController.update);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: "[Admin/TI] Remove um papel"
 *     description: So permitido se nenhum UserSystemAccess (ativo ou historico) usar este papel.
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Role removida
 *       404:
 *         description: Role nao encontrada
 *       409:
 *         description: Role em uso - nao pode ser removida
 */
roleRouter.delete("/:id", roleController.remove);
