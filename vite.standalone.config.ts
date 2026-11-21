import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A separate entry point is deliberate: the deployed React sketchbook app
// remains unchanged. The HTML build reuses the exact seven processing engines.
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 12 * 1024 * 1024,
    rollupOptions: {
      input: 'standalone.html',
      output: { inlineDynamicImports: true },
    },
  },
});
