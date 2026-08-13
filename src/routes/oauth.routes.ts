import { Router } from "express";
import { oauthController } from "../controllers/oauth.controller";

export const oauthRouter = Router();

/**
 * @swagger
 * /authorize:
 *   get:
 *     summary: OAuth2 Authorization Code - inicio do fluxo
 *     description: |
 *       Browser-facing. Sem sessao valida no IdP, redireciona pro /login-ui (preservando a URL original
 *       em return_to); com sessao mas mustChangePassword=true, redireciona pro /change-password-ui;
 *       com tudo certo, redireciona pro redirect_uri com `code` (valido por 60s) e `state`.
 *
 *       `redirect_uri` e validado por comparacao EXATA contra System.redirectUris - nunca prefixo/regex.
 *     tags: [OAuth2]
 *     parameters:
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: redirect_uri
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: response_type
 *         required: true
 *         schema: { type: string, enum: [code] }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *         description: Opaco pro IdP - devolvido sem alteracao no redirect final (protecao CSRF do lado do cliente).
 *     responses:
 *       302:
 *         description: Redireciona pro login, pra troca de senha, ou pro redirect_uri com code/state (ou error/error_description em caso de falha apos redirect_uri ja validado)
 *       400:
 *         description: client_id ou redirect_uri invalidos/nao cadastrados (json direto, nunca redirect - redirect_uri ainda nao e confiavel nesse ponto)
 *         content:
 *           application/json: { schema: { $ref: '#/components/schemas/DomainError' } }
 */
oauthRouter.get("/authorize", oauthController.authorize);

/**
 * @swagger
 * /token:
 *   post:
 *     summary: Troca code ou refresh_token por access_token (server-to-server)
 *     description: |
 *       `grant_type=authorization_code`: troca o `code` (de /authorize) por tokens. `redirect_uri` deve
 *       ser IDENTICO ao usado em /authorize.
 *
 *       `grant_type=refresh_token`: renova sem novo login. access_token dura 15 minutos;
 *       refresh_token dura 30 dias.
 *     tags: [OAuth2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [grant_type, client_id, client_secret]
 *             properties:
 *               grant_type: { type: string, enum: [authorization_code, refresh_token] }
 *               code: { type: string, description: "Obrigatorio se grant_type=authorization_code" }
 *               redirect_uri: { type: string, description: "Obrigatorio se grant_type=authorization_code" }
 *               refresh_token: { type: string, description: "Obrigatorio se grant_type=refresh_token" }
 *               client_id: { type: string }
 *               client_secret: { type: string }
 *     responses:
 *       200:
 *         description: Tokens emitidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token: { type: string, description: "JWT RS256, valido 15min" }
 *                 refresh_token: { type: string }
 *                 token_type: { type: string, enum: [Bearer] }
 *                 expires_in: { type: integer, example: 900 }
 *       400:
 *         description: invalid_request (campos ausentes) ou invalid_grant (code/refresh_token invalido, expirado, ja usado, ou reuso detectado)
 *       401:
 *         description: invalid_client (client_id/client_secret nao batem)
 */
oauthRouter.post("/token", oauthController.token);

/**
 * @swagger
 * /revoke:
 *   post:
 *     summary: Revoga um refresh_token (RFC 7009)
 *     description: |
 *       Chamado pelo idp-client no logout (best-effort). Sempre 200, mesmo se o token ja nao existia,
 *       ja estava revogado, ou pertencia a outro cliente - RFC 7009 nunca revela isso a quem chama.
 *     tags: [OAuth2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [token, client_id, client_secret]
 *             properties:
 *               token: { type: string, description: "O refresh_token a revogar" }
 *               client_id: { type: string }
 *               client_secret: { type: string }
 *     responses:
 *       200:
 *         description: Sempre 200 (ver descricao)
 *       401:
 *         description: invalid_client (client_id/client_secret nao batem)
 */
oauthRouter.post("/revoke", oauthController.revoke);
