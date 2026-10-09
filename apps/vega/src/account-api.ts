import { createClient, getMe } from '@helicraft/alhena';
import type { Principal } from '@helicraft/alhena';
import { z } from 'zod';

const ErrorSchema = z.object({ message: z.string() });
function browserClient(): ReturnType<typeof createClient> {
  return createClient({ baseUrl: globalThis.location?.origin, credentials: 'same-origin' });
}
async function currentAccount(): Promise<Principal> {
  const { data } = await getMe({ client: browserClient(), throwOnError: true });
  return data;
}
function errorMessage(error: unknown): string {
  const parsed = ErrorSchema.safeParse(error);
  return parsed.success ? parsed.data.message : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}
function safeReturn(value: unknown): string {
  return typeof value === 'string' &&
    /^\/(?:app|admin)(?:\/[^\\]*)?$/u.test(value) &&
    !value.includes('//')
    ? value
    : '/app';
}
export { browserClient, currentAccount, errorMessage, safeReturn };
