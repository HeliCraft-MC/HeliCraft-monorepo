import type { IStateOrder } from '~/interfaces/state/state.types';
import { updateOrder } from '~/utils/states/orders.utils';

defineRouteMeta({
    openAPI: {
        tags: ['order'],
        description: 'Update an order',
        parameters: [{ in: 'path', name: 'uuid', required: true }],
        requestBody: {
            description: 'Patch fields',
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } },
    },
});

export default defineEventHandler(async (event) => {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody<Record<string, unknown>>(event);
    const patch: Partial<IStateOrder> = {};
    if (typeof body.title === 'string')
        patch.title = body.title;
    if (typeof body.text === 'string')
        patch.text = body.text;
    if (body.importance === 'pinned' || body.importance === 'high' || body.importance === 'medium' || body.importance === 'low')
        patch.importance = body.importance;
    if (typeof body.is_active === 'boolean')
        patch.is_active = body.is_active;
    if (typeof body.expires_at === 'number' || body.expires_at === null)
        patch.expires_at = body.expires_at as number | null;
    await updateOrder(uuid, patch, requireAuthenticatedUuid(event));
    return { ok: true };
});
