import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['fx-workflow.spec.ts', 'company-formation.spec.ts'],
  outputDir: 'apps/vega/test-results/fx',
  workers: 1,
  timeout: 120_000,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'development', use: { baseURL: 'http://localhost:5187' } },
    { name: 'production', use: { baseURL: 'http://localhost:8089' } },
  ],
  webServer: [
    {
      command: 'bun tests/e2e/fx-server.ts',
      url: 'http://localhost:3117/api/health',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'API_PROXY_TARGET=http://localhost:3117 bun run --cwd apps/vega dev --port 5187',
      url: 'http://localhost:5187/src/client.tsx',
      reuseExistingServer: false,
    },
    {
      command:
        'VEGA_BUILD_ROOT=apps/vega/dist PORT=8089 API_PROXY_TARGET=http://localhost:3118 bun infra/serve-vega.ts',
      url: 'http://localhost:8089',
      reuseExistingServer: false,
    },
  ],
});
