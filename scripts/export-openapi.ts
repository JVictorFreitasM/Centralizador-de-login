// Exporta a spec OpenAPI pra docs/openapi.json sem precisar subir o backend
// inteiro (sem Postgres, SESSION_SECRET ou chaves JWT) - so le os comentarios
// @swagger dos arquivos de rota. Usado no CI (.github/workflows/deploy-docs.yml)
// e localmente via `npm run docs:export`.
import fs from "fs";
import path from "path";
import { buildOpenApiSpec } from "../src/swagger";

const outDir = path.join(__dirname, "..", "docs");
const outFile = path.join(outDir, "openapi.json");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(buildOpenApiSpec(), null, 2));

console.log(`OpenAPI spec exportado para ${outFile}`);
