import { Router } from "express";
import { accessController } from "../controllers/access.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const accessRouter = Router();

accessRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

/**
 * @swagger
 * /access:
 *   post:
 *     summary: "[Admin/TI] Concede acesso de um usuario a um sistema com um papel"
 *     description: Reflete imediatamente em GET /me/systems do usuario (proxima carga, sem cache).
 *     tags: [Acessos (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, systemId, roleId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               systemId: { type: string, format: uuid }
 *               roleId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Acesso concedido
 *       409:
 *         description: Usuario ja tem acesso ativo a este sistema
 */
accessRouter.post("/", accessController.grant);

/**
 * @swagger
 * /access/{id}/revoke:
 *   post:
 *     summary: "[Admin/TI] Revoga um acesso concedido"
 *     description: Sistema some da lista de GET /me/systems do usuario na proxima carga.
 *     tags: [Acessos (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Acesso revogado
 *       404:
 *         description: Acesso nao encontrado
 *       409:
 *         description: Acesso ja estava revogado
 */
accessRouter.post("/:id/revoke", accessController.revoke);

/**
 * @swagger
 * /access/{id}/role:
 *   patch:
 *     summary: "[Admin/TI] Troca o papel de um acesso ja concedido"
 *     tags: [Acessos (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties:
 *               roleId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Papel atualizado
 *       404:
 *         description: Acesso ou role nao encontrado
 *       409:
 *         description: Role pertence a outro sistema
 */
accessRouter.patch("/:id/role", accessController.changeRole);
