import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';

import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { authSessions } from '../../db/schema';
import { PrincipalSchema, RenameSchema, ChangePasswordSchema } from './contracts';
import { HTTP } from '../errors';
import { response, errors, SuccessSchema, SessionSchema } from './route-contracts';
import type { IdentityRuntime } from './route-contracts';

function mountgetMe(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { auth } = runtime;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/auth/me',
      operationId: 'getMe',
      responses: { 200: response(PrincipalSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      return context.json(current.principal, HTTP.ok);
    },
  );
}

function mountgetAccount(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { auth } = runtime;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account',
      operationId: 'getAccount',
      responses: { 200: response(PrincipalSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      return context.json(current.principal, HTTP.ok);
    },
  );
}

function mountchangeUsername(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth } = runtime;
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/account/username',
      operationId: 'changeUsername',
      request: {
        body: { required: true, content: { 'application/json': { schema: RenameSchema } } },
      },
      responses: { 200: response(PrincipalSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      const input = context.req.valid('json');
      await services().identity.rename(current.principal.id, input.username, input.currentPassword);
      const updated = await auth(context);
      return context.json(updated.principal, HTTP.ok);
    },
  );
}

function mountchangePassword(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth, clearCookie } = runtime;
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/account/password',
      operationId: 'changePassword',
      request: {
        body: { required: true, content: { 'application/json': { schema: ChangePasswordSchema } } },
      },
      responses: { 200: response(SuccessSchema), ...errors },
    }),
    async (context) => {
      const input = context.req.valid('json');
      const current = await auth(context);
      await services().identity.changePassword(
        current.principal.id,
        input.currentPassword,
        input.password,
      );
      clearCookie(context);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
}

function mountgetSessions(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth } = runtime;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/sessions',
      operationId: 'getSessions',
      responses: { 200: response(z.array(SessionSchema)), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      const rows = await services()
        .db.select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.userId, current.principal.id),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
            gt(authSessions.absoluteExpiresAt, new Date()),
          ),
        )
        .orderBy(desc(authSessions.lastSeenAt));
      return context.json(
        rows.map((row) => ({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          lastSeenAt: row.lastSeenAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          userAgent: row.userAgent,
          current: row.id === current.sessionId,
        })),
        HTTP.ok,
      );
    },
  );
}

function mountrevokeSession(app: OpenAPIHono, runtime: IdentityRuntime): void {
  const { services, auth, clearCookie } = runtime;
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/account/sessions/{id}',
      operationId: 'revokeSession',
      request: { params: z.object({ id: z.uuid() }) },
      responses: { 200: response(SuccessSchema), ...errors },
    }),
    async (context) => {
      const current = await auth(context);
      const { id } = context.req.valid('param');
      await services().sessions.revoke(id, current.principal.id);
      if (id === current.sessionId) {
        clearCookie(context);
      }
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
}

export {
  mountgetMe,
  mountgetAccount,
  mountchangeUsername,
  mountchangePassword,
  mountgetSessions,
  mountrevokeSession,
};
