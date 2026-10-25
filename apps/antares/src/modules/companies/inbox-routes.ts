// oxlint-disable import/max-dependencies -- The protected inbox exposes typed task pages and exact formation progress using existing participant authorization.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { companyActor } from './store';
import { CompanyInboxKindSchema, CompanyInboxPageSchema } from './inbox-contracts';
import { formationInbox } from './inbox-formation';
import { registrationInbox, decisionInbox } from './inbox-decisions';
import { CompanyDraftService } from './drafts';
import { formationProgress, FormationProgressSchema } from './formation-progress';
import { sharesInbox } from './inbox-shares';

// oxlint-disable-next-line max-lines-per-function -- Typed inbox and progress routes delegate to existing participant and Governance authorization.
function companyInboxRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-inbox',
      operationId: 'listCompanyInbox',
      request: { query: z.object({ kind: CompanyInboxKindSchema, after: z.uuid().optional() }) },
      responses: {
        200: json(CompanyInboxPageSchema),
        400: json(z.object({ message: z.string() })),
        401: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      if (db === undefined) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANIES_UNAVAILABLE',
          'Согласования временно недоступны',
        );
      }
      const { kind, after } = context.req.valid('query');
      const page = await db.transaction(async (transaction) => {
        await companyActor(transaction, actor.id);
        if (kind === 'FORMATION') {
          return await formationInbox(transaction, actor.id, after);
        }
        if (kind === 'REGISTRATION') {
          return await registrationInbox(transaction, actor.id, after);
        }
        if (kind === 'SHARES') {
          return await sharesInbox(transaction, actor.id, after);
        }
        return await decisionInbox(transaction, { actorId: actor.id, kind, after });
      });
      return context.json(page, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-drafts/{id}/progress',
      operationId: 'getCompanyFormationProgress',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: json(FormationProgressSchema),
        401: json(z.object({ message: z.string() })),
        404: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      if (db === undefined) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANIES_UNAVAILABLE',
          'Согласования временно недоступны',
        );
      }
      const draft = await new CompanyDraftService(db).get(context.req.valid('param').id, actor.id);
      return context.json(
        await db.transaction(async (transaction) => await formationProgress(transaction, draft)),
        HTTP.ok,
      );
    },
  );
  return app;
}
export { companyInboxRoutes };
