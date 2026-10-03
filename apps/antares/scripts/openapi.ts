import { createApp } from '../src/app';

const JSON_INDENT = 2;
const app = createApp({
  checkReady: async (): Promise<void> => {
    await Promise.resolve();
  },
});
const response = await app.request('/openapi.json');
await Bun.write(
  new URL('../openapi.json', import.meta.url),
  `${JSON.stringify(await response.json(), null, JSON_INDENT)}\n`,
);
