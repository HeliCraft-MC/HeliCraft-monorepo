defineRouteMeta({
    openAPI: {
        tags: ['alliances'],
        description: 'Leave an alliance',
        parameters: [
            { in: 'path', name: 'uuid', required: true },
            { in: 'header', name: 'Authorization', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
            description: 'State UUID',
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            stateUuid: { type: 'string' },
                        },
                        required: ['stateUuid'],
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Left alliance',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: { ok: { type: 'boolean' } },
                        },
                    },
                },
            },
            403: { description: 'Not authorized' },
            404: { description: 'Membership not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const allianceUuid = getRouterParam(event, 'uuid');
    const { stateUuid } = await readBody(event);
    const playerUuid = requireAuthenticatedUuid(event);
    await leaveAlliance(allianceUuid, stateUuid, playerUuid);
    return { ok: true };
});
