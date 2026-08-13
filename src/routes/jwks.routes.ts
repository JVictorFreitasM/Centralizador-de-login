import { Router } from "express";
import { jwksController } from "../controllers/jwks.controller";

export const jwksRouter = Router();

/**
 * @swagger
 * /.well-known/jwks.json:
 *   get:
 *     summary: Chaves publicas (JWKS) pra validar access_tokens
 *     description: |
 *       Endpoint publico, sem autenticacao. Sistemas clientes (idp-client) fazem cache local com TTL
 *       configuravel e refazem a busca automaticamente se aparecer um `kid` desconhecido no cache -
 *       permite rotacao de chave no IdP sem exigir restart manual de cada sistema cliente.
 *     tags: [JWKS]
 *     responses:
 *       200:
 *         description: Conjunto de chaves publicas no formato JWK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kty: { type: string, example: RSA }
 *                       kid: { type: string }
 *                       use: { type: string, example: sig }
 *                       alg: { type: string, example: RS256 }
 *                       n: { type: string }
 *                       e: { type: string, example: AQAB }
 */
jwksRouter.get("/.well-known/jwks.json", jwksController.getJwks);
