// src/lib/api.js
// Wrapper minimo de fetch pras duas chamadas que esta UI precisa (login,
// troca de senha) - sem axios, app pequeno demais pra justificar a
// dependencia extra.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error_description || data?.error || `Erro na requisicao (HTTP ${status})`);
    this.status = status;
    this.data = data;
  }
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}

export function login(email, password) {
  return apiPost('/login', { email, password });
}

export function changePassword(currentPassword, newPassword) {
  return apiPost('/password/change', { currentPassword, newPassword });
}
