// src/lib/api.js
// Wrapper minimo de fetch pras chamadas que esta UI precisa - sem axios,
// app pequeno demais pra justificar a dependencia extra.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error_description || data?.error || `Erro na requisicao (HTTP ${status})`);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}

function apiGet(path) {
  return request('GET', path);
}

function apiPost(path, body) {
  return request('POST', path, body);
}

export function login(email, password) {
  return apiPost('/login', { email, password });
}

export function changePassword(currentPassword, newPassword) {
  return apiPost('/password/change', { currentPassword, newPassword });
}

export function getMe() {
  return apiGet('/me');
}

export function getMySystems() {
  return apiGet('/me/systems');
}

export function logout() {
  return apiPost('/logout');
}
