import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'apps/vega/test-results/gallery-public',
  testMatch: 'gallery-public.spec.ts',
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'development', use: { baseURL: 'http://localhost:5185' } },
    { name: 'production', use: { baseURL: 'http://localhost:8087' } },
  ],
  webServer: [
    {
      command: 'bun tests/e2e/gallery-fixture-server.ts',
      url: 'http://127.0.0.1:3115/api/health',
      reuseExistingServer: false,
    },
    {
      command:
        'VEGA_BUILD_ROOT=apps/vega/dist PORT=8087 API_PROXY_TARGET=http://127.0.0.1:3115 bun infra/serve-vega.ts',
      url: 'http://localhost:8087',
      reuseExistingServer: false,
    },
    {
      command: 'API_PROXY_TARGET=http://127.0.0.1:3115 bun run --cwd apps/vega dev --port 5185',
      url: 'http://localhost:5185',
      reuseExistingServer: false,
    },
  ],
});
