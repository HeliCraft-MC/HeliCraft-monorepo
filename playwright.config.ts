import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'development',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175' },
    },
    { name: 'production', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8085' } },
  ],
  webServer: [
    {
      command: 'bun tests/e2e/server.ts',
      url: 'http://localhost:3100/api/health',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'API_PROXY_TARGET=http://localhost:3100 bun run --cwd apps/vega dev --port 5175',
      url: 'http://localhost:5175',
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/e2e/static-server.ts',
      url: 'http://localhost:8085',
      reuseExistingServer: false,
    },
  ],
});
