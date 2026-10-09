import { createClient, getHello } from '@helicraft/alhena';
import { z } from 'zod';

const GreetingSchema = z.object({ message: z.string() });
export async function loadGreeting(signal?: AbortSignal): Promise<z.infer<typeof GreetingSchema>> {
  const client = createClient({ baseUrl: globalThis.location?.origin ?? 'http://localhost:3000' });
  const { data } = await getHello({
    client,
    query: { name: 'HeliCraft' },
    signal,
    throwOnError: true,
  });
  return GreetingSchema.parse(data);
}
