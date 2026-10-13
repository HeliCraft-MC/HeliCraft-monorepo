import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { SessionService } from '../sessions/service';
import { DomainError, HTTP } from '../errors';
import type { Principal } from '../identity/contracts';

function json<Schema extends z.ZodType>(
  schema: Schema,
): { description: string; content: Record<'application/json', { schema: Schema }> } {
  return { description: 'Result', content: { 'application/json': { schema } } };
}
function authenticator(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): (context: Context) => Promise<Principal> {
  const sessions = db ? new SessionService(db) : null;
  return async (context) => {
    const token = getCookie(context, secureCookies ? '__Host-helicraft' : 'helicraft_session');
    if (token === undefined || token === '') {
      throw new DomainError(HTTP.unauthenticated, 'UNAUTHENTICATED', 'Войдите в аккаунт');
    }
    if (!sessions) {
      throw new DomainError(
        HTTP.unavailable,
        'PERSISTENCE_UNAVAILABLE',
        'Аккаунты временно недоступны',
      );
    }
    const authenticated = await sessions.authenticate(token);
    return authenticated.principal;
  };
}
export { json, authenticator };
