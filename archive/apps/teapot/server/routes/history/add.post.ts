defineRouteMeta({
    openAPI: {
        tags: ['history'],
        description: 'Add a history event',
        parameters: [
            { in: 'header', name: 'Authorization', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
            description: 'History event data',
            required: true,
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/HistoryInsert' },
                },
            },
        },
        responses: {
            200: {
                description: 'Event created',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: { uuid: { type: 'string' } },
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
    const body = await readBody(event);
    const uuid = await addHistoryEvent({ ...body, created_by_uuid: actorUuid });
    return { uuid };
});
