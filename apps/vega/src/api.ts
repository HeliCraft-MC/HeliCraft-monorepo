import { DEFAULT_SERVER_NAME } from './site-branding';
import { createClient, getHello } from '@helicraft/alhena';
import { z } from 'zod';

const GreetingSchema = z.object({ message: z.string() });
export async function loadGreeting(signal?: AbortSignal): Promise<z.infer<typeof GreetingSchema>> {
  const client = createClient({ baseUrl: globalThis.location?.origin ?? 'http://localhost:3000' });
  const { data } = await getHello({
    client,
    query: { name: DEFAULT_SERVER_NAME },
    signal,
    throwOnError: true,
  });
  return GreetingSchema.parse(data);
}
