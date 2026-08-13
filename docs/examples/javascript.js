// docs/examples/javascript.js - Exemplos com Fetch API
// Node 18+ (fetch nativo) ou navegador.

const IDP_URL = 'http://localhost:3000';

// 1. Login local (sessao do IdP - guarda o cookie manualmente fora do navegador)
async function login(email, password) {
  const res = await fetch(`${IDP_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // essencial no navegador, pro cookie idp.sid ser enviado/recebido
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // { mustChangePassword }
}

// 2. Sistemas com acesso (menu central, OS 13)
async function getMySystems() {
  const res = await fetch(`${IDP_URL}/me/systems`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

// 3. OAuth2: trocar authorization_code por tokens (SEMPRE no backend do
// sistema cliente - client_secret nunca deve rodar no navegador)
async function exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch(`${IDP_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // { access_token, refresh_token, token_type, expires_in }
}

// 4. OAuth2: renovar access_token
async function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  const res = await fetch(`${IDP_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

// 5. JWKS (validacao local de tokens - normalmente feito pelo idp-client, nao a mao)
async function getJwks() {
  const res = await fetch(`${IDP_URL}/.well-known/jwks.json`);
  return res.json();
}

// Uso
(async () => {
  try {
    await login('usuario@empresa.com', 'senha123');
    const systems = await getMySystems();
    console.log('Sistemas com acesso:', systems);
  } catch (error) {
    console.error('Erro:', error.message);
  }
})();
