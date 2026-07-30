import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash, createPublicKey, type JsonWebKey } from "crypto";

const PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH ?? "keys/private.pem";
const PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH ?? "keys/public.pem";

function loadKey(path: string, label: string): string {
  try {
    return readFileSync(resolve(process.cwd(), path), "utf8");
  } catch {
    throw new Error(
      `${label} nao encontrada em "${path}". Rode "npm run generate:keys" pra gerar o par de chaves RSA.`
    );
  }
}

let privateKey: string | undefined;
let publicKey: string | undefined;

export function getJwtPrivateKey(): string {
  privateKey ??= loadKey(PRIVATE_KEY_PATH, "Chave privada do JWT");
  return privateKey;
}

export function getJwtPublicKey(): string {
  publicKey ??= loadKey(PUBLIC_KEY_PATH, "Chave publica do JWT");
  return publicKey;
}

let keyId: string | undefined;
let publicJwk: JsonWebKey | undefined;

// kid derivado do fingerprint (SHA-256) da propria chave publica, nao de um
// valor configurado a mao - assim ele muda sozinho se o par RSA for
// rotacionado (gerando novo keys/*.pem), sem risco de ficar dessincronizado
// (OS 05, secao 3.1/3.2).
export function getKeyId(): string {
  if (!keyId) {
    const der = createPublicKey(getJwtPublicKey()).export({ type: "spki", format: "der" });
    keyId = createHash("sha256").update(der).digest("hex").slice(0, 16);
  }
  return keyId;
}

// JWK (RFC 7517) da chave publica atual, pronto pra entrar no array `keys`
// do documento JWKS (OS 05, secao 3.1).
export function getPublicJwk(): JsonWebKey & { kid: string; use: string; alg: string } {
  publicJwk ??= createPublicKey(getJwtPublicKey()).export({ format: "jwk" });
  return { ...publicJwk, kid: getKeyId(), use: "sig", alg: "RS256" };
}
