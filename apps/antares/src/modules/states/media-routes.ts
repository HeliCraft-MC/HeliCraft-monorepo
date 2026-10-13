import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { SkinDependencies } from '../skins/routes';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { StateMediaService } from './media';
import { readReformProposal, readProposal } from './proposals';
import { StateService } from './service';

const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  413: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Typed media route declarations delegate storage and authorization to services.
function stateMediaRoutes(dependencies: SkinDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(dependencies.db, dependencies.secureCookies);
  function service(): StateMediaService {
    if (!dependencies.db || !dependencies.storage || dependencies.bucket === undefined) {
      throw new DomainError(HTTP.unavailable, 'STORAGE_UNAVAILABLE', 'Хранилище недоступно');
    }
    return new StateMediaService(dependencies.db, dependencies.storage, dependencies.bucket);
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-flags',
      operationId: 'uploadStateFlag',
      request: {
        body: {
          content: {
            'multipart/form-data': {
              schema: z.object({ file: z.file().openapi({ type: 'string', format: 'binary' }) }),
            },
          },
        },
      },
      responses: {
        200: json(z.object({ id: z.uuid(), width: z.number(), height: z.number() })),
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      const form = await context.req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        throw new DomainError(HTTP.badRequest, 'FILE_REQUIRED', 'Выберите PNG');
      }
      return context.json(await service().upload(actor.id, file), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-flags/{id}',
      operationId: 'getStateFlag',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: {
          description: 'PNG flag',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      context.header('Content-Type', 'image/png');
      return context.body(
        new Uint8Array(await service().read(context.req.valid('param').id, actor.id)),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/states/{slug}/flag',
      operationId: 'getPublicStateFlag',
      request: { params: z.object({ slug: z.string() }) },
      responses: {
        200: {
          description: 'PNG flag',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        ...Errors,
      },
    }),
    async (context) => {
      if (!dependencies.db) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Государства недоступны',
        );
      }
      const state = await new StateService(dependencies.db).publicBySlug(
        context.req.valid('param').slug,
        'en',
      );
      const flag = state.configuration.horizontalFlag;
      const owner = state.founders.find((founder) => founder.type === 'PRIMARY');
      if (flag.mode !== 'PNG' || flag.mediaId === null || !owner) {
        throw new DomainError(HTTP.notFound, 'FLAG_NOT_FOUND', 'PNG-флаг отсутствует');
      }
      context.header('Content-Type', 'image/png');
      return context.body(new Uint8Array(await service().read(flag.mediaId)), HTTP.ok);
    },
  );
  for (const admin of [true, false]) {
    app.openapi(
      createRoute({
        method: 'get',
        path: admin ? '/admin/states/{id}/flag' : '/account/states/{id}/flag',
        operationId: admin ? 'getAdminStateFlag' : 'getOwnedStateFlag',
        request: {
          params: z.object({ id: z.uuid() }),
          query: z.object({ revisionId: z.uuid().optional() }),
        },
        responses: {
          200: {
            description: 'PNG flag',
            content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
          },
          ...Errors,
        },
      }),
      async (context) => {
        const actor = await authenticate(context);
        if (!dependencies.db) {
          throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
        }
        const state = await new StateService(dependencies.db).detail(
          context.req.valid('param').id,
          'en',
          { actorId: actor.id, admin, revisionId: context.req.valid('query').revisionId },
        );
        const flag = state.configuration.horizontalFlag;
        if (flag.mode !== 'PNG' || flag.mediaId === null) {
          throw new DomainError(HTTP.notFound, 'FLAG_NOT_FOUND', 'PNG-флаг отсутствует');
        }
        context.header('Content-Type', 'image/png');
        return context.body(new Uint8Array(await service().read(flag.mediaId)), HTTP.ok);
      },
    );
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-reform-votes/{id}/flag',
      operationId: 'getStateReformProposalFlag',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: {
          description: 'PNG proposal flag',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      if (!dependencies.db) {
        throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
      }
      const proposal = await readReformProposal(dependencies.db, {
        votingId: context.req.valid('param').id,
        actorId: actor.id,
        locale: 'en',
      });
      const flag = proposal.configuration.horizontalFlag;
      if (flag.mode !== 'PNG' || flag.mediaId === null) {
        throw new DomainError(HTTP.notFound, 'FLAG_NOT_FOUND', 'PNG-флаг отсутствует');
      }
      context.header('Content-Type', 'image/png');
      return context.body(new Uint8Array(await service().read(flag.mediaId)), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-reform-proposals/{id}/flag',
      operationId: 'getStateProposalFlag',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: {
          description: 'PNG proposal flag',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      if (!dependencies.db) {
        throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
      }
      const proposal = await readProposal(dependencies.db, {
        proposalId: context.req.valid('param').id,
        actorId: actor.id,
        locale: 'en',
      });
      const flag = proposal.configuration.horizontalFlag;
      if (flag.mode !== 'PNG' || flag.mediaId === null) {
        throw new DomainError(HTTP.notFound, 'FLAG_NOT_FOUND', 'PNG-флаг отсутствует');
      }
      context.header('Content-Type', 'image/png');
      return context.body(new Uint8Array(await service().read(flag.mediaId)), HTTP.ok);
    },
  );
  return app;
}
export { stateMediaRoutes };
