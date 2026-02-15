import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  envPrefix: ['VITE_', 'ELECTRON_'],
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/main/services/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit'
    }
  }
});
