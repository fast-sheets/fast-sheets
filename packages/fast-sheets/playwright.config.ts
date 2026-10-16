import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'vite --config tests/e2e/vite.config.ts',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
