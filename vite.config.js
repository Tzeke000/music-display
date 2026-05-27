import { defineConfig } from 'vite';

// base: './' keeps the built bundle path-relative so the production build in
// dist/ can be opened from any folder or static host without rewriting URLs.
export default defineConfig({
  base: './',
  server: {
    host: true,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
