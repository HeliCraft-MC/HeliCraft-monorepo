defineRouteMeta({
    openAPI: {
        tags: ['wars'],
        description: 'Respond to a war declaration',
        parameters: [
            { in: 'path', name: 'uuid', required: true },
        ],
        requestBody: {
            description: 'Defender info and decision',
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
            200: {
                description: 'Decision recorded',
                content: {
                    'application/json': {
                        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
                    },
                },
            },
            400: { description: 'War already processed' },
            403: { description: 'Not authorized' },
            404: { description: 'Defender not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const warUuid = getRouterParam(event, 'uuid');
    const { defenderStateUuid, accept } = await readBody(event);
    const defenderPlayerUuid = requireAuthenticatedUuid(event);
    await respondWarDeclaration(warUuid, defenderStateUuid, defenderPlayerUuid, accept);
    return { ok: true };
});
