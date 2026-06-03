import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Separate config for the Docker/strfry + nak e2e suite. Kept out of the fast
// unit gate (`npm test`); run with `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
