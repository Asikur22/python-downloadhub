import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const frontendPort = parseInt(process.env.FRONTEND_PORT || '8975', 10);
const backendPort = parseInt(process.env.BACKEND_PORT || '8974', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port: frontendPort,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
