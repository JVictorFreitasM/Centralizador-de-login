import { createHash, timingSafeEqual } from "crypto";

// SHA-256 simples (nao bcrypt) para secrets/tokens aleatorios de alta
// entropia, que nao precisam do custo computacional pensado pra senhas
// escolhidas por humanos (ver OS 01, secao 4).
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Compara em tempo constante o hash do valor recebido contra o hash salvo,
// evitando timing attack na verificacao de client_secret.
export function matchesHash(plain: string, storedHash: string): boolean {
  const providedHash = Buffer.from(sha256Hex(plain), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (providedHash.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(providedHash, stored);
}
