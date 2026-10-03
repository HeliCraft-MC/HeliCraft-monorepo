import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('antares API', () => {
  it('validates the query and returns a greeting', async () => {
    expect.assertions(3);
    const app = createApp({
      checkReady: async (): Promise<void> => {
        await Promise.resolve();
      },
    });
    const greeting = await app.request('/api/hello?name=Vega');
    await expect(greeting.json()).resolves.toStrictEqual({ message: 'Hello, Vega!' });
    const invalid = await app.request('/api/hello?name=');
    expect(invalid.status).toBe(400);
    const spec = await app.request('/openapi.json');
    expect(spec.status).toBe(200);
  }, 5000);

  it('reports dependency failure without leaking internals', async () => {
    expect.assertions(2);
    const app = createApp({
      checkReady: async (): Promise<void> => {
        await Promise.resolve();
        throw new Error('private connection details');
      },
    });
    const response = await app.request('/api/ready');
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toStrictEqual({ message: 'Dependencies unavailable' });
  }, 5000);
});
