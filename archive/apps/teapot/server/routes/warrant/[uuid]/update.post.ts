import type { IStateWarrant } from '~/interfaces/state/state.types';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { updateWarrant } from '~/utils/states/orders.utils';

defineRouteMeta({
    openAPI: {
        tags: ['warrant'],
        description: 'Update a warrant',
        parameters: [{ in: 'path', name: 'uuid', required: true }],
        requestBody: {
            description: 'Patch fields',
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
            200: {
                description: 'Updated',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: { ok: { type: 'boolean' } },
                        },
                    },
                },
            },
        },
    },
});

export default defineEventHandler(async (event) => {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody<Record<string, unknown>>(event);
    const patch: Partial<IStateWarrant> = {};
    if (typeof body.reason === 'string')
        patch.reason = body.reason;
    if (typeof body.actions_taken_by_admins === 'boolean')
        patch.actions_taken_by_admins = body.actions_taken_by_admins;
    if (typeof body.actions_taken_by_state === 'boolean')
        patch.actions_taken_by_state = body.actions_taken_by_state;
    const adminDetails = body.actions_by_admins_details;
    if (typeof adminDetails === 'string' || adminDetails === null) {
        patch.actions_by_admins_details = adminDetails as string | null;
    }
    const stateDetails = body.actions_by_state_details;
    if (typeof stateDetails === 'string' || stateDetails === null) {
        patch.actions_by_state_details = stateDetails as string | null;
    }

    await updateWarrant(uuid, patch, requireAuthenticatedUuid(event));

    return { ok: true };
});
