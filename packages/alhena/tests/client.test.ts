import { describe, expect, it, vi } from 'vitest';
import { createClient, getHello } from '../src';

describe('alhena transport', () => {
  it('sends typed requests through an isolated Fetch client', async () => {
    expect.assertions(2);
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ message: 'Hello, Vega!' }));
    const client = createClient({ baseUrl: 'http://antares.test', fetch: transport });
    const { data } = await getHello({ client, query: { name: 'Vega' }, throwOnError: true });
    expect(data.message).toBe('Hello, Vega!');
    expect(transport).toHaveBeenCalledTimes(1);
  }, 5000);
});
