import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'apps/vega/test-results/company-catalogue',
  testMatch: ['company-catalogue-public.spec.ts', 'company-profile-public.spec.ts'],
  workers: 1,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'development', use: { baseURL: 'http://localhost:5186' } },
    { name: 'production', use: { baseURL: 'http://localhost:8088' } },
  ],
  webServer: [
    {
      command: 'bun tests/e2e/company-catalogue-fixture-server.ts',
      url: 'http://127.0.0.1:3116/api/health',
      reuseExistingServer: false,
    },
    {
      command:
        'VEGA_BUILD_ROOT=apps/vega/dist PORT=8088 API_PROXY_TARGET=http://127.0.0.1:3116 bun infra/serve-vega.ts',
      url: 'http://localhost:8088',
      reuseExistingServer: false,
    },
    {
      command: 'API_PROXY_TARGET=http://127.0.0.1:3116 bun run --cwd apps/vega dev --port 5186',
      url: 'http://localhost:5186/src/client.tsx',
      reuseExistingServer: false,
    },
  ],
});
