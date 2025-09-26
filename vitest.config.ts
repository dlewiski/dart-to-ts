import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test-project/',
        'output/',
        'extracted/',
        'scripts/',
        '*.config.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});