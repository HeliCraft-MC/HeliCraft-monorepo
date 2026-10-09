import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';

import { CredentialsSchema, LoginSchema, PrincipalSchema } from './contracts';
import { HTTP, DomainError } from '../errors';
import {
  response,
  errors,
  SuccessSchema,
  REGISTER_LIMIT,
  LOGIN_LIMIT,
  LOGIN_NAME_LIMIT,
} from './route-contracts';
import type { IdentityRuntime } from './route-contracts';

function mountregister(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, cookie, limiter, config } = runtime;
  app.openapi(
    createRoute({
      method: 'post',
      path: '/auth/register',
      operationId: 'register',
      request: {
        body: { required: true, content: { 'application/json': { schema: CredentialsSchema } } },
      },
      responses: { 200: response(PrincipalSchema), ...errors },
    }),
    async (context) => {
      if (!config.registrationEnabled) {
        throw new DomainError(HTTP.forbidden, 'REGISTRATION_CLOSED', 'Регистрация закрыта');
      }
      limiter.take('register:global', REGISTER_LIMIT);
      const input = context.req.valid('json');
      const token = await services().identity.register(
        input.username,
        input.password,
        context.req.header('user-agent'),
      );
      cookie(context, token);
      const current = await services().sessions.authenticate(token);
      return context.json(current.principal, HTTP.ok);
    },
  );
}

function mountlogin(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, cookie, limiter, cookieName } = runtime;
  app.openapi(
    createRoute({
      method: 'post',
      path: '/auth/login',
      operationId: 'login',
      request: {
        body: { required: true, content: { 'application/json': { schema: LoginSchema } } },
      },
      responses: { 200: response(PrincipalSchema), ...errors },
    }),
    async (context) => {
      const input = context.req.valid('json');
      limiter.take('login:global', LOGIN_LIMIT);
      limiter.take(`login:${input.username.toLowerCase()}`, LOGIN_NAME_LIMIT);
      const token = await services().identity.login(
        input.username,
        input.password,
        context.req.header('user-agent'),
      );
      const previous = getCookie(context, cookieName);
      if (previous !== undefined) {
        const old = await services()
          .sessions.authenticate(previous)
          .catch(() => null);
        if (old) {
          await services().sessions.revoke(old.sessionId, old.principal.id);
        }
      }
      cookie(context, token);
      const current = await services().sessions.authenticate(token);
      return context.json(current.principal, HTTP.ok);
    },
  );
}

function mountlogout(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth, clearCookie } = runtime;
  app.openapi(
    createRoute({
      method: 'post',
      path: '/auth/logout',
      operationId: 'logout',
      responses: { 200: response(SuccessSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      await services().sessions.revoke(current.sessionId, current.principal.id);
      clearCookie(context);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
}

function mountlogoutAll(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth, clearCookie } = runtime;
  app.openapi(
    createRoute({
      method: 'post',
      path: '/auth/logout-all',
      operationId: 'logoutAll',
      responses: { 200: response(SuccessSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      await services().sessions.revokeAll(current.principal.id);
      clearCookie(context);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
}

export { mountregister, mountlogin, mountlogout, mountlogoutAll };
