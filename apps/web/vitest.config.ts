import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // jsdom bajo carga (api y web en paralelo) supera a veces los 5 s por defecto.
    testTimeout: 15_000,
  },
});
