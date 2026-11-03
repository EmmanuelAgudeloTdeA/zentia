import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Las pruebas de integración comparten la base de TEST_DATABASE_URL: se ejecutan en serie.
    fileParallelism: !process.env['TEST_DATABASE_URL'],
  },
});
