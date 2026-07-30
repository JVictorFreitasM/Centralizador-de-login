import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const RedirectUrisSchema = z
  .array(z.string().refine(isValidUrl, "redirect_uri invalida"), {
    required_error: "Informe ao menos uma redirect_uri",
    invalid_type_error: "redirectUris deve ser uma lista de URLs",
  })
  .min(1, "Informe ao menos uma redirect_uri");

export const CreateSystemSchema = z
  .object({
    name: z
      .string({ required_error: "Nome e obrigatorio", invalid_type_error: "Nome e obrigatorio" })
      .refine((value) => value.trim().length > 0, "Nome e obrigatorio")
      .transform((value) => value.trim()),
    slug: z
      .string({ required_error: "Slug e obrigatorio", invalid_type_error: "Slug e obrigatorio" })
      .refine((value) => SLUG_REGEX.test(value), "Slug deve conter apenas letras minusculas, numeros e hifens")
      .transform((value) => value.trim()),
    redirectUris: RedirectUrisSchema,
  })
  .strip();
export type CreateSystemDTO = z.infer<typeof CreateSystemSchema>;

export const UpdateSystemSchema = z
  .object({
    name: z.string().min(1, "Nome e obrigatorio").transform((value) => value.trim()).optional(),
    redirectUris: RedirectUrisSchema.optional(),
    active: z.boolean().optional(),
  })
  .strip();
export type UpdateSystemDTO = z.infer<typeof UpdateSystemSchema>;

export interface SystemResponseDTO {
  id: string;
  name: string;
  slug: string;
  clientId: string;
  redirectUris: string[];
  active: boolean;
  createdAt: Date;
}

// client_secret em texto puro so aparece aqui - na criacao ou na
// regeneracao. Nunca mais depois disso (OS 06, secao 5).
export interface CreateSystemResponseDTO extends SystemResponseDTO {
  clientSecret: string;
}

export interface RegenerateSecretResponseDTO {
  id: string;
  clientSecret: string;
}
