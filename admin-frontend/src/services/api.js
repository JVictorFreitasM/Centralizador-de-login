// src/services/api.js
// Camada de API centralizada (equivalente ao services/apiFetch.js da
// referencia) - todo componente fala com o backend so atraves daqui, nunca
// via axios direto. Diferente da referencia, aqui os erros do backend
// carregam mensagem util (`{ error, error_description }`, OS 02-06), entao
// em vez de engolir o erro e devolver null, propagamos com uma mensagem
// legivel pronta pra exibir na UI.
import axios from 'axios';

const http = axios.create({
  withCredentials: true,
});

export function getErrorMessage(err, fallback = 'Erro inesperado. Tente novamente.') {
  const data = err?.response?.data;
  return data?.error_description || data?.error || fallback;
}

// --- Autenticacao local (OS 02) ---
export const authApi = {
  me: () => http.get('/me'),
  login: (email, password) => http.post('/login', { email, password }),
  logout: () => http.post('/logout'),
  changePassword: (currentPassword, newPassword) =>
    http.post('/password/change', { currentPassword, newPassword }),
};

// --- Usuarios (OS 02 + OS 06) ---
export const usersApi = {
  list: (params) => http.get('/users', { params }),
  create: (data) => http.post('/users', data),
  setActive: (id, active) => http.patch(`/users/${id}`, { active }),
  resetPassword: (id) => http.post(`/users/${id}/reset-password`),
  listAccess: (userId) => http.get(`/users/${userId}/access`),
};

// --- Sistemas e papeis (OS 06) ---
export const systemsApi = {
  list: () => http.get('/systems'),
  create: (data) => http.post('/systems', data),
  update: (id, data) => http.patch(`/systems/${id}`, data),
  regenerateSecret: (id) => http.post(`/systems/${id}/regenerate-secret`),
  listRoles: (systemId) => http.get(`/systems/${systemId}/roles`),
  createRole: (systemId, data) => http.post(`/systems/${systemId}/roles`, data),
};

export const rolesApi = {
  update: (id, data) => http.patch(`/roles/${id}`, data),
  remove: (id) => http.delete(`/roles/${id}`),
};

// --- Concessao de acesso (OS 06) ---
export const accessApi = {
  grant: (data) => http.post('/access', data),
  revoke: (id) => http.post(`/access/${id}/revoke`),
  changeRole: (id, roleId) => http.patch(`/access/${id}/role`, { roleId }),
};

// --- Auditoria (OS 06, somente leitura) ---
export const auditApi = {
  list: (params) => http.get('/audit-logs', { params }),
};
