import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import { PrismaSessionStore } from "./lib/sessionStore";
import { redact } from "./lib/redact";
import { router } from "./routes";
import { DomainError } from "./errors/domain.errors";
import { mountPublicAuthUi } from "./lib/publicAuthUi";

// Sessao do IdP so controla "estou logado no IdP" (nao acesso a dado
// sensivel de nenhum sistema cliente), por isso pode durar mais que o
// access token emitido na OS 03/04.
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function createApp() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET nao definido no ambiente");
  }

  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  // Clientes OAuth2 tradicionalmente enviam /token como
  // application/x-www-form-urlencoded (RFC 6749) - json() acima cobre o
  // resto da API.
  app.use(express.urlencoded({ extended: false }));

  app.use(
    session({
      name: "idp.sid",
      secret: sessionSecret,
      store: new PrismaSessionStore(),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        // Preparado desde ja para producao atras de HTTPS, mesmo que esta
        // fase ainda rode em HTTP puro.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_MS,
      },
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  mountPublicAuthUi(app);

  app.use(router);

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota nao encontrada" });
  });

  // Handler global de erros - unico lugar que traduz um DomainError lancado
  // por um Service (via Controller) em status/corpo HTTP (OS 04-B).
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) {
      res.status(err.statusCode).json(err.toResponseBody());
      return;
    }

    console.error("[error]", {
      method: req.method,
      path: req.path,
      body: redact(req.body),
      error: err instanceof Error ? err.message : err,
    });
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
}
