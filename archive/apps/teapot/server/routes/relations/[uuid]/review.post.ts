defineRouteMeta({
    openAPI: {
        tags: ['relations'],
        description: 'Review a relation change request',
        parameters: [
            { in: 'path', name: 'uuid', required: true },
        ],
        requestBody: {
            description: 'Reviewer info and decision',
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            reviewerStateUuid: { type: 'string' },
                            reviewerPlayerUuid: { type: 'string' },
                            approve: { type: 'boolean' },
                        },
                        required: ['reviewerStateUuid', 'reviewerPlayerUuid', 'approve'],
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Request reviewed',
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
            404: { description: 'Request not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const requestUuid = getRouterParam(event, 'uuid');
    const { reviewerStateUuid, approve } = await readBody(event);
    const reviewerPlayerUuid = requireAuthenticatedUuid(event);
    await reviewRelationChange(requestUuid, reviewerStateUuid, reviewerPlayerUuid, approve);
    return { ok: true };
});
