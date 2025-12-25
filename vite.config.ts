import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // This ensures paths are relative for GitHub Pages deployment
  build: {
    outDir: 'dist',
  }
});
