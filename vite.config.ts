import { defineConfig } from 'vite';

// base 使用相對路徑，讓同一份 build 可掛在 GitHub Pages 子目錄下
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
});
