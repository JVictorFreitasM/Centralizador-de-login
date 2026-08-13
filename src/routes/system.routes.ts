import { Router } from "express";
import { systemController } from "../controllers/system.controller";
import { roleController } from "../controllers/role.controller";
import { requireAuth, requireTI } from "../middlewares/session.middleware";
import { blockIfMustChangePassword } from "../middlewares/mustChangePassword.middleware";

export const systemRouter = Router();

systemRouter.use(requireAuth, blockIfMustChangePassword, requireTI);

/**
 * @swagger
 * /systems:
 *   get:
 *     summary: "[Admin/TI] Lista sistemas clientes cadastrados"
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200:
 *         description: Lista de sistemas (nunca inclui clientSecretHash)
 */
systemRouter.get("/", systemController.list);

/**
 * @swagger
 * /systems:
 *   post:
 *     summary: "[Admin/TI] Cadastra um sistema cliente"
 *     description: client_id e client_secret sao gerados automaticamente. client_secret so aparece em texto puro nesta resposta (ou em regenerate-secret).
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, redirectUris]
 *             properties:
 *               name: { type: string, example: Farol }
 *               slug: { type: string, example: farol, description: "letras minusculas, numeros e hifens" }
 *               redirectUris:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["http://localhost:5174/api/auth/callback"]
 *               postLogoutRedirectUris:
 *                 type: array
 *                 items: { type: string }
 *                 description: "Opcional - so necessario se o sistema usar GET /session/end. Match exato, nao por origem."
 *                 example: ["http://localhost:5174/"]
 *     responses:
 *       201:
 *         description: Sistema criado, com clientSecret em texto puro
 *       409:
 *         description: Slug ja cadastrado
 */
systemRouter.post("/", systemController.create);

/**
 * @swagger
 * /systems/{id}:
 *   patch:
 *     summary: "[Admin/TI] Atualiza nome, redirectUris, postLogoutRedirectUris ou active de um sistema"
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
 *               redirectUris: { type: array, items: { type: string } }
 *               postLogoutRedirectUris: { type: array, items: { type: string } }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Sistema atualizado
 *       404:
 *         description: Sistema nao encontrado
 */
systemRouter.patch("/:id", systemController.update);

/**
 * @swagger
 * /systems/{id}/regenerate-secret:
 *   post:
 *     summary: "[Admin/TI] Gera um novo client_secret pro sistema"
 *     description: O secret antigo deixa de funcionar imediatamente - sistemas que ainda o usam param de conseguir trocar code por token ate serem atualizados.
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Novo clientSecret em texto puro (unica vez)
 *       404:
 *         description: Sistema nao encontrado
 */
systemRouter.post("/:id/regenerate-secret", systemController.regenerateSecret);

/**
 * @swagger
 * /systems/{systemId}/roles:
 *   get:
 *     summary: "[Admin/TI] Lista papeis (roles) de um sistema"
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de roles do sistema
 */
systemRouter.get("/:systemId/roles", roleController.listForSystem);

/**
 * @swagger
 * /systems/{systemId}/roles:
 *   post:
 *     summary: "[Admin/TI] Cria um papel (role) num sistema"
 *     description: Nomes devem bater EXATAMENTE com o enum de roles do sistema cliente (comparacao case-sensitive em requireRole()).
 *     tags: [Sistemas (Admin)]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: gerente }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Role criada
 *       409:
 *         description: Ja existe role com este nome neste sistema
 */
systemRouter.post("/:systemId/roles", roleController.create);
