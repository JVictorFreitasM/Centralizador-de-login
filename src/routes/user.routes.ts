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

/**
 * @swagger
 * /users:
 *   get:
 *     summary: "[Admin/TI] Lista usuarios (paginado, com busca)"
 *     tags: [Usuarios (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca por nome ou e-mail
 *     responses:
 *       200:
 *         description: Lista de usuarios (sem passwordHash)
 *       401:
 *         description: Sem sessao valida
 *       403:
 *         description: Usuario nao e TI, ou ainda esta com senha provisoria
 */
userRouter.get("/", userController.list);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: "[Admin/TI] Cria um usuario"
 *     description: Senha provisoria e gerada pelo sistema (nunca aceita no request) - retornada em texto puro so nesta resposta.
 *     tags: [Usuarios (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, example: usuario@empresa.com }
 *     responses:
 *       201:
 *         description: Usuario criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *                 tempPassword: { type: string, description: "So aparece nesta resposta - nunca mais recuperavel" }
 *       409:
 *         description: Ja existe usuario com este e-mail
 */
userRouter.post("/", userController.create);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: "[Admin/TI] Ativa/desativa um usuario"
 *     tags: [Usuarios (Admin)]
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
 *             required: [active]
 *             properties:
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Usuario atualizado
 *       404:
 *         description: Usuario nao encontrado
 */
userRouter.patch("/:id", userController.setActive);

/**
 * @swagger
 * /users/{id}/reset-password:
 *   post:
 *     summary: "[Admin/TI] Gera nova senha provisoria pro usuario"
 *     description: Forca mustChangePassword=true - o usuario precisa trocar no proximo login.
 *     tags: [Usuarios (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nova senha provisoria (texto puro, so nesta resposta)
 *       404:
 *         description: Usuario nao encontrado
 */
userRouter.post("/:id/reset-password", userController.resetPassword);

/**
 * @swagger
 * /users/{userId}/access:
 *   get:
 *     summary: "[Admin/TI] Lista acessos concedidos a um usuario (ativos e revogados)"
 *     tags: [Usuarios (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Historico de acessos do usuario
 */
userRouter.get("/:userId/access", accessController.listForUser);
