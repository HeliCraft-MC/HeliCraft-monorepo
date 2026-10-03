defineRouteMeta({
    openAPI: {
        tags: ['history'],
        description: 'Update a history event',
        parameters: [
            { in: 'path', name: 'uuid', required: true },
        ],
        requestBody: {
            description: 'Patch fields',
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
            200: {
                description: 'Event updated',
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
    const body = await readBody(event);
    await updateHistoryEvent(uuid, body);
    return { ok: true };
});
