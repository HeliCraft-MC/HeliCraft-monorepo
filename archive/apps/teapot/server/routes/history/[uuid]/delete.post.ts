defineRouteMeta({
    openAPI: {
        tags: ['history'],
        description: 'Soft-delete a history event',
        parameters: [
            { in: 'path', name: 'uuid', required: true },
        ],
        responses: {
            200: {
                description: 'Event deleted',
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
    const actorUuid = event.context.auth?.uuid;
    if (!actorUuid || !await isUserAdmin(actorUuid)) {
        throw createError({ statusCode: 403, statusMessage: 'Administrator access required' });
    }
    const uuid = getRouterParam(event, 'uuid');
    await softDeleteHistoryEvent(uuid, actorUuid);
    return { ok: true };
});
