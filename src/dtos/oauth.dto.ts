import { z } from "zod";

// GET /authorize nao usa zod: a validacao de client_id/redirect_uri e de
// negocio (existe no banco? esta ativo? bate com a lista registrada?), nao
// de formato - cada verificacao tem uma resposta HTTP propria (json direto
// vs redirect) que o OAuthService decide via AuthorizeDecision abaixo.
export interface AuthorizeInputDTO {
  clientId?: string;
  redirectUri?: string;
  responseType?: string;
  sessionUserId?: string;
}

export type AuthorizeDecision =
  | { kind: "invalid_request"; body: { error: string; error_description?: string } }
  | { kind: "need_login"; destroySession: boolean }
  | { kind: "need_password_change" }
  | { kind: "redirect_error"; redirectUri: string; error: string; description?: string }
  | { kind: "success"; redirectUri: string; code: string };

export interface TokenRequestDTO {
  grantType?: string;
  code?: string;
  redirectUri?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

// So checam presenca/tipo (igual ao `typeof x !== "string"` original) - sem
// mensagem por campo porque a rota original colapsava qualquer um desses
// campos faltando/errados na mesma resposta "invalid_request". Um schema
// por grant_type, ja que os campos exigidos sao diferentes (OS 04).
export const AuthorizationCodeGrantFieldsSchema = z.object({
  code: z.string(),
  redirectUri: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
});

export const RefreshTokenGrantFieldsSchema = z.object({
  refreshToken: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
});

export interface TokenResponseDTO {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface RevokeRequestDTO {
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export const RevokeRequestFieldsSchema = z.object({
  token: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
});
