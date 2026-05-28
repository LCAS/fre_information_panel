import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BRIDGE_PROXY_TARGET =
  process.env.FRE_INFORMATION_PANEL_BRIDGE_PROXY_TARGET ?? 'http://127.0.0.1:9000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/capability': {
        target: BRIDGE_PROXY_TARGET,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // Prevent Vite from pre-bundling the native Node.js addon;
  // only the browser-safe rclnodejs/web ESM entry is used by the React app.
  optimizeDeps: {
    exclude: ['rclnodejs'],
  },
});
