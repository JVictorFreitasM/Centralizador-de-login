// Anexa query params a uma URL, absoluta (redirect_uri de um sistema
// cliente) ou relativa (paginas de UI internas do IdP), preservando o tipo
// de entrada na saida.
export function withParams(base: string, params: Record<string, string | undefined>): string {
  const url = new URL(base, "http://placeholder.local");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
  return base.startsWith("http://") || base.startsWith("https://") ? url.toString() : `${url.pathname}${url.search}`;
}
