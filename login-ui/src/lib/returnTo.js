// src/lib/returnTo.js
// Protecao contra open redirect (OS 02-B, secao 4): so aceita `return_to`
// que resolve pra MESMA origem do proprio IdP - path relativo ou URL
// absoluta com origin identico. Qualquer outra coisa (dominio externo,
// "//evil.com" protocol-relative, etc.) e rejeitada.
export function safeReturnTo(rawValue) {
  if (!rawValue) return null;

  try {
    const resolved = new URL(rawValue, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      return null;
    }
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}

export function appendReturnTo(path, returnTo) {
  if (!returnTo) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set('return_to', returnTo);
  return url.pathname + url.search;
}
