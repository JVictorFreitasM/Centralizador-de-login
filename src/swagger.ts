import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

// Config OpenAPI do IdP (OS Documentacao de API). Servers refletem o
// docker-compose real (backend exposto em 3000) - sem entrada fake de
// "producao", ja que este projeto ainda nao tem uma.
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IdP Centralizador de Login",
      version: "1.0.0",
      description:
        "Identity Provider central (OAuth2 Authorization Code + JWT RS256) usado pelos sistemas internos " +
        "(Contracheque Bot, Farol, Gerenciamento de TVs). Ver /session-end e /me/systems pro menu central (OS 13).",
    },
    servers: [{ url: "http://localhost:3000", description: "Desenvolvimento local (docker-compose)" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "access_token emitido por POST /token (grant_type=authorization_code|refresh_token). " +
            "Valido por 15 minutos - use refresh_token pra renovar sem novo login.",
        },
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "idp.sid",
          description:
            "Sessao do proprio IdP (login local em POST /login, painel administrativo, /me, /me/systems). " +
            "Cookie httpOnly, nao e o mesmo mecanismo do access_token OAuth2 acima.",
        },
      },
      schemas: {
        DomainError: {
          type: "object",
          description:
            "Formato REAL de erro deste backend - nunca {message, code, details, timestamp}. " +
            "Rotas legadas (auth/usuarios) usam `error` como a propria mensagem em portugues; " +
            "rotas OAuth2 (RFC 6749) usam codigos curtos em `error` + `error_description` opcional.",
          properties: {
            error: { type: "string", example: "Credenciais invalidas" },
            error_description: { type: "string", example: "post_logout_redirect_uri fora da origem registrada" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.ts"],
};

// Separado de setupSwagger de proposito: gerar o spec e so ler os comentarios
// JSDoc dos arquivos de rota (estatico, sem precisar de app/DB/sessao/chaves
// JWT rodando) - usado tanto aqui quanto em scripts/export-openapi.ts (CI/CD,
// FASE 7) pra exportar docs/openapi.json sem subir o backend inteiro.
export function buildOpenApiSpec(): object {
  return swaggerJsdoc(options);
}

export function setupSwagger(app: Express): void {
  const specs = buildOpenApiSpec();

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      swaggerOptions: { persistAuthorization: true, filter: true, docExpansion: "list" },
      customSiteTitle: "IdP Centralizador de Login - API Docs",
    })
  );

  app.get("/api-docs.json", (_req, res) => {
    res.json(specs);
  });

  // ReDoc via CDN (sem depender do pacote redoc-express, que so serviria
  // a mesma coisa com uma dependencia extra pra um handler de uma linha).
  app.get("/redoc", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>IdP Centralizador de Login - ReDoc</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="/api-docs.json"></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
</body>
</html>`);
  });
}
