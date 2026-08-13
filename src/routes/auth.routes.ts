import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/session.middleware";
import { loginRateLimiter } from "../middlewares/rateLimit.middleware";

export const authRouter = Router();

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Usuario da sessao atual
 *     description: Retorna o usuario autenticado via cookie de sessao do IdP (nao o access_token OAuth2).
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200:
 *         description: Usuario logado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *                 active: { type: boolean }
 *                 mustChangePassword: { type: boolean }
 *                 isTI: { type: boolean }
 *       401:
 *         description: Sem sessao valida
 *         content:
 *           application/json: { schema: { $ref: '#/components/schemas/DomainError' } }
 */
authRouter.get("/me", requireAuth, authController.me);

/**
 * @swagger
 * /me/systems:
 *   get:
 *     summary: Sistemas com acesso ativo do usuario logado (OS 13)
 *     description: Alimenta o menu central pos-login - so sistemas com UserSystemAccess ativo e System ativo.
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200:
 *         description: Lista de sistemas acessiveis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   systemId: { type: string, format: uuid }
 *                   name: { type: string, example: Farol }
 *                   slug: { type: string, example: farol }
 *                   role: { type: string, example: gerente }
 *                   loginUrl:
 *                     type: string
 *                     description: /auth/login do PROPRIO sistema cliente (nunca /authorize do IdP direto) - preserva o path completo do redirectUri cadastrado (OS 07-B).
 *                     example: http://localhost:5174/api/auth/login
 *       401:
 *         description: Sem sessao valida
 */
authRouter.get("/me/systems", requireAuth, authController.mySystems);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login local (e-mail + senha)
 *     description: |
 *       Cria a sessao do IdP (cookie httpOnly `idp.sid`). Nao retorna token OAuth2 - isso so acontece
 *       via /authorize + /token, mesmo para o mesmo usuario.
 *
 *       **Rate limit:** 5 tentativas com erro por IP a cada 15 minutos (so conta falhas).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: usuario@empresa.com }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mustChangePassword: { type: boolean }
 *       401:
 *         description: Credenciais invalidas (mensagem generica de proposito - nunca revela se foi e-mail ou senha)
 *       429:
 *         description: Muitas tentativas de login - aguarde a janela de 15 minutos
 */
authRouter.post("/login", loginRateLimiter, authController.login);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Encerra a sessao do IdP
 *     description: Destroi a sessao local e limpa o cookie `idp.sid`. Nao afeta tokens OAuth2 ja emitidos para sistemas clientes (ver /revoke pra isso).
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       204:
 *         description: Sessao encerrada
 *       401:
 *         description: Sem sessao valida
 */
authRouter.post("/logout", requireAuth, authController.logout);

/**
 * @swagger
 * /session/end:
 *   get:
 *     summary: RP-Initiated Logout - encerra a sessao do IdP e redireciona de volta
 *     description: |
 *       Contraparte navegavel de /logout, chamada pelo idp-client (createLogoutHandler) apos o sistema
 *       cliente encerrar sua PROPRIA sessao local. E o unico jeito de tambem encerrar a sessao do IdP
 *       (cookie httpOnly desta origem, invisivel pro backend do sistema cliente) - sem isso o SSO
 *       reautentica silenciosamente no proximo /authorize.
 *
 *       Idempotente: funciona mesmo sem sessao ativa. `post_logout_redirect_uri` precisa bater
 *       EXATAMENTE (nao so a origem) com uma entrada em `System.postLogoutRedirectUris`, senao
 *       e rejeitado (protecao contra open redirect).
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: post_logout_redirect_uri
 *         required: true
 *         schema: { type: string }
 *         description: Precisa estar cadastrado em postLogoutRedirectUris do System (match exato, com barra final se aplicavel).
 *     responses:
 *       302:
 *         description: Sessao encerrada (se havia) e redirecionado pro destino
 *       400:
 *         description: client_id desconhecido/inativo (invalid_client) ou post_logout_redirect_uri nao cadastrado (invalid_redirect_uri)
 *         content:
 *           application/json: { schema: { $ref: '#/components/schemas/DomainError' } }
 */
authRouter.get("/session/end", authController.endSession);

/**
 * @swagger
 * /password/change:
 *   post:
 *     summary: Troca a senha do usuario logado
 *     description: Usado tanto no fluxo de troca obrigatoria (mustChangePassword=true) quanto por escolha do proprio usuario.
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       204:
 *         description: Senha alterada
 *       401:
 *         description: Sem sessao valida ou senha atual incorreta
 */
authRouter.post("/password/change", requireAuth, authController.changePassword);
