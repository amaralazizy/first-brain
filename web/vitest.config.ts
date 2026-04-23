import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/lib/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/app.e2e.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});