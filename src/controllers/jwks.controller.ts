import type { RequestHandler } from "express";
import { jwksService } from "../services/jwks.service";

export const jwksController = {
  // Rota publica de proposito (OS 05, secao 4) - a chave PUBLICA e
  // intencionalmente exposta sem autenticacao, e o comportamento correto
  // do padrao JWKS.
  getJwks: ((_req, res) => {
    // Orienta o cache do lado do cliente (OS 05, secao 3.4) sem impedir
    // que uma rotacao de chave eventualmente se propague.
    res.set("Cache-Control", "public, max-age=3600");
    res.json(jwksService.getJwks());
  }) satisfies RequestHandler,
};
