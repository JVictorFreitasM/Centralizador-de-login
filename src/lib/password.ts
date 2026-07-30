import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const SALT_ROUNDS = 12;

// Sem caracteres ambiguos (0/O, 1/l/I) - a senha temporaria e repassada
// verbalmente/por texto ao funcionario, precisa ser facil de digitar certo.
const TEMP_PASSWORD_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateTempPassword(length = 8): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += TEMP_PASSWORD_CHARSET[randomInt(TEMP_PASSWORD_CHARSET.length)];
  }
  return result;
}
