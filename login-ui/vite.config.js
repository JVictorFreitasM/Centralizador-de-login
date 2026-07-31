import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Servido pelo proprio backend do IdP em producao (mesma origem, sem CORS -
// IDP_LOGIN_URL/IDP_PASSWORD_CHANGE_URL sao paths relativos). Este proxy e
// so pra dev iterativo com hot-reload; o fluxo real (redirecionado pelo
// /authorize) so funciona de fato contra o build servido pelo Express
// (`npm run build` aqui + backend rodando).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': { target: 'http://localhost:3000', changeOrigin: true, secure: false },
      '/password': { target: 'http://localhost:3000', changeOrigin: true, secure: false },
    },
  },
});
