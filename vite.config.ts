import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.FORGE_BASE_PATH || '/',
  build: { outDir: 'dist', emptyOutDir: true },
});
