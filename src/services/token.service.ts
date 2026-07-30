import jwt from "jsonwebtoken";
import { getJwtPrivateKey, getKeyId } from "../lib/jwtKeys";

const ISSUER = process.env.JWT_ISSUER ?? "idp-centralizador-login";
export const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 15 * 60);

interface AccessTokenParams {
  userId: string;
  email: string;
  name: string;
  clientId: string;
  // Slug do sistema (ex.: "farol"), alem do aud/client_id - claim `system`
  // definida na OS 05 pra ficar legivel sem o sistema cliente precisar
  // saber mapear client_id -> nome.
  systemSlug: string;
  // Token e emitido especificamente pra um client_id (aud), entao carrega
  // so o papel do usuario NAQUELE sistema - mais enxuto que embutir os
  // papeis de todos os sistemas do usuario num unico token (OS 03, 3.2).
  role: string | null;
}

export const tokenService = {
  signAccessToken({ userId, email, name, clientId, systemSlug, role }: AccessTokenParams): string {
    return jwt.sign({ email, name, system: systemSlug, role }, getJwtPrivateKey(), {
      algorithm: "RS256",
      issuer: ISSUER,
      audience: clientId,
      subject: userId,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      // kid no header - permite ao sistema cliente escolher a chave certa
      // no JWKS mesmo apos uma rotacao futura (OS 05, secao 3.2).
      keyid: getKeyId(),
    });
  },
};
