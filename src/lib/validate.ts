import type { ZodType, ZodTypeDef } from "zod";
import { ValidationError } from "../errors/domain.errors";

// Fronteira de validacao de formato dos DTOs de entrada (OS 04-B, secao
// 3.2). Qualquer falha vira um ValidationError generico com a mensagem do
// primeiro issue - os schemas usam `message` customizado por campo pra
// preservar exatamente os textos de erro que as rotas originais (OS 02/03)
// ja retornavam.
//
// Output e Input sao parametros de tipo separados (em vez de so <T>) pra
// nao confundir a inferencia quando Input != Output, como acontece com
// z.coerce (ex.: AuditLogQuerySchema) - com um so <T>, o TS tenta unificar
// Input=Output e a query acaba tipada com os campos default como opcionais.
export function parseOrThrow<Output, Input = unknown>(schema: ZodType<Output, ZodTypeDef, Input>, data: unknown): Output {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Dados invalidos");
  }
  return result.data;
}
