import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O backend do IdP nao usa prefixo /api (rotas na raiz: /login, /users,
// /systems, ...) - por isso o proxy aqui e por path especifico, em vez do
// unico location /api/ usado na referencia. As rotas do proprio front
// (React Router) foram escolhidas de proposito em portugues (/usuarios,
// /sistemas, /acessos, /auditoria, /entrar) pra nunca colidir com esses
// prefixos.
const BACKEND_URL = 'http://localhost:3000';
const BACKEND_PATHS = [
  '/me',
  '/login',
  '/logout',
  '/password',
  '/users',
  '/systems',
  '/roles',
  '/access',
  '/audit-logs',
  '/authorize',
  '/token',
  '/.well-known',
  '/health',
];

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(
      BACKEND_PATHS.map((path) => [path, { target: BACKEND_URL, changeOrigin: true, secure: false }])
    ),
  },
});
