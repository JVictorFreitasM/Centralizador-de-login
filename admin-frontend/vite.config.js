import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O backend do IdP nao usa prefixo /api (rotas na raiz: /login, /users,
// /systems, ...) - por isso o proxy aqui e por path especifico, em vez do
// unico location /api/ usado na referencia. As rotas do proprio front
// (React Router) foram escolhidas de proposito em portugues (/usuarios,
// /sistemas, /acessos, /auditoria, /entrar) pra nunca colidir com esses
// prefixos.
// Fora do Docker (dev local), o backend fala em localhost:3000. Dentro do
// compose, "localhost" dentro do container do admin-frontend nao alcanca o
// container do backend - precisa ser o nome do servico ("backend"). Por
// isso o alvo do proxy e parametrizavel via VITE_API_URL.
const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:3000';
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
    // Bind mount do Docker Desktop no Windows nao propaga eventos nativos
    // de sistema de arquivos pro container - sem isto, hot-reload nao
    // dispara quando o arquivo e editado no host. Custo (mais CPU) e
    // aceitavel pro tamanho deste projeto; sem downside relevante fora do
    // Docker tambem.
    watch: {
      usePolling: true,
    },
  },
});
