import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    host: true,
  },
  // Prevent Vite from pre-bundling the native Node.js addon;
  // only the browser-safe rclnodejs/web ESM entry is used by the React app.
  optimizeDeps: {
    exclude: ['rclnodejs'],
  },
});
