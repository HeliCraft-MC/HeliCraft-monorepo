import { createApp } from '../../apps/antares/src/app';
// Browser tests use the actual API contract without external persistence.
const app = createApp({
  checkReady: async (): Promise<void> => {
    await Promise.resolve();
  },
});
Bun.serve({ port: 3000, fetch: app.fetch });
