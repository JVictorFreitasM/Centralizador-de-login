const SENSITIVE_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "passwordHash",
  "tempPassword",
  "clientSecretHash",
  "tokenHash",
  "client_secret",
  "code",
  "access_token",
  "refresh_token",
  "token",
]);

// Usado antes de logar corpo de requisicao em erros - nunca deixar senha ou
// hash vazar em log de aplicacao, mesmo em captura de erro que pega o body
// inteiro.
export function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redact(entry);
  }
  return result;
}
