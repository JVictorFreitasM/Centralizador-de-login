// Gera o par de chaves RSA usado para assinar (privada) e futuramente
// validar via JWKS (publica, OS 05) os access tokens emitidos em /token.
// Nunca versionar a chave privada - keys/ esta no .gitignore.
import { generateKeyPairSync } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH ?? "keys/private.pem";
const PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH ?? "keys/public.pem";
const force = process.argv.includes("--force");

function main() {
  const privatePath = resolve(process.cwd(), PRIVATE_KEY_PATH);
  const publicPath = resolve(process.cwd(), PUBLIC_KEY_PATH);

  if (!force && (existsSync(privatePath) || existsSync(publicPath))) {
    console.error(
      `Ja existe uma chave em ${PRIVATE_KEY_PATH} ou ${PUBLIC_KEY_PATH}. Use --force pra sobrescrever (invalida tokens ja emitidos).`
    );
    process.exit(1);
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  mkdirSync(dirname(privatePath), { recursive: true });
  mkdirSync(dirname(publicPath), { recursive: true });
  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  writeFileSync(publicPath, publicKey);

  console.log(`Chave privada gerada em ${PRIVATE_KEY_PATH}`);
  console.log(`Chave publica gerada em ${PUBLIC_KEY_PATH}`);
}

main();
