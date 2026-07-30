import { z } from "zod";

// Mesma mensagem usada tanto pra tipo invalido quanto pra credencial errada
// (OS 02: nunca revelar qual foi o problema) - so o status HTTP difere (400
// aqui vs 401 quando as credenciais realmente nao batem).
const CREDENTIALS_MESSAGE = "Credenciais invalidas";

export const LoginSchema = z
  .object({
    email: z
      .string({ required_error: CREDENTIALS_MESSAGE, invalid_type_error: CREDENTIALS_MESSAGE })
      .transform((value) => value.trim().toLowerCase()),
    password: z.string({ required_error: CREDENTIALS_MESSAGE, invalid_type_error: CREDENTIALS_MESSAGE }),
  })
  .strip();
export type LoginDTO = z.infer<typeof LoginSchema>;

export interface LoginResponseDTO {
  mustChangePassword: boolean;
}

// OS 06: o painel de administracao (SPA) precisa de um jeito de saber
// "quem esta logado" ao carregar/recarregar a pagina, sem depender de
// tentar uma acao que muda estado so pra descobrir se a sessao e valida.
export interface MeResponseDTO {
  id: string;
  name: string;
  email: string;
  active: boolean;
  mustChangePassword: boolean;
  isTI: boolean;
}

const DADOS_INVALIDOS = "Dados invalidos";

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string({ required_error: DADOS_INVALIDOS, invalid_type_error: DADOS_INVALIDOS }),
    newPassword: z
      .string({ required_error: DADOS_INVALIDOS, invalid_type_error: DADOS_INVALIDOS })
      .min(8, "A nova senha deve ter pelo menos 8 caracteres"),
  })
  .strip();
export type PasswordChangeDTO = z.infer<typeof PasswordChangeSchema>;
