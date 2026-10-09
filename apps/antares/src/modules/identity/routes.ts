// oxlint-disable import/max-dependencies -- Composition root imports each independently maintained route or contract; domain implementation stays isolated.
import { OpenAPIHono } from '@hono/zod-openapi';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { IdentityService } from './service';
import { SessionService } from '../sessions/service';
import type { Authenticated } from '../sessions/service';
import { RateLimiter } from '../sessions/security';
import { HTTP, DomainError } from '../errors';
import type { AuthConfig, IdentityRuntime } from './route-contracts';
import { mountregister, mountlogin, mountlogout, mountlogoutAll } from './auth-routes';
import {
  mountgetMe,
  mountgetAccount,
  mountchangeUsername,
  mountchangePassword,
  mountgetSessions,
  mountrevokeSession,
} from './account-routes';

const MAX_SESSION_SECONDS = 2_592_000;
function identityRoutes(db: Database['db'] | undefined, config: AuthConfig): OpenAPIHono {
  const app = new OpenAPIHono();
  const sessions = db ? new SessionService(db) : undefined;
  const identity = db ? new IdentityService(db) : undefined;
  const limiter = new RateLimiter();
  const cookieName = config.secureCookies ? '__Host-helicraft' : 'helicraft_session';
  function services(): { sessions: SessionService; identity: IdentityService; db: Database['db'] } {
    if (!sessions || !identity || !db) {
      throw new DomainError(
        HTTP.unavailable,
        'PERSISTENCE_UNAVAILABLE',
        'Сервис аккаунтов недоступен',
      );
    }
    return { sessions, identity, db };
  }
  function cookie(context: Context, token: string): void {
    setCookie(context, cookieName, token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'Lax',
      path: '/',
      maxAge: MAX_SESSION_SECONDS,
    });
  }
  function clearCookie(context: Context): void {
    deleteCookie(context, cookieName, { secure: config.secureCookies, path: '/' });
  }
  async function auth(context: Context): Promise<Authenticated> {
    return await services().sessions.authenticate(getCookie(context, cookieName));
  }

  const runtime: IdentityRuntime = {
    services,
    auth,
    cookie,
    clearCookie,
    limiter,
    cookieName,
    config,
  };
  for (const mount of [
    mountregister,
    mountlogin,
    mountgetMe,
    mountgetAccount,
    mountlogout,
    mountlogoutAll,
    mountchangeUsername,
    mountchangePassword,
    mountgetSessions,
    mountrevokeSession,
  ]) {
    mount(app, runtime);
  }
  return app;
}

export { identityRoutes };
export type { AuthConfig } from './route-contracts';
