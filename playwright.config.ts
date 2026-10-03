import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'development',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
    { name: 'production', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8080' } },
  ],
  webServer: [
    {
      command: 'bun run --cwd apps/vega dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/e2e/server.ts',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/e2e/static-server.ts',
      url: 'http://localhost:8080',
      reuseExistingServer: false,
    },
  ],
});
