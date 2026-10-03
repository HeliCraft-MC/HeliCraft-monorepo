import { deleteWarrant } from '~/utils/states/orders.utils';

defineRouteMeta({
    openAPI: {
        tags: ['warrant'],
        description: 'Delete a warrant',
        parameters: [{ in: 'path', name: 'uuid', required: true }],
        requestBody: {
            description: 'Requester UUID',
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { 200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } },
    },
});

export default defineEventHandler(async (event) => {
    const uuid = getRouterParam(event, 'uuid');
    await deleteWarrant(uuid, requireAuthenticatedUuid(event));
    return { ok: true };
});
