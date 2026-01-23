import { unlikeImage } from '~/utils/gallery.utils';

defineRouteMeta({
    openAPI: {
        tags: ['gallery'],
        description: 'Unlike a gallery image (requires authentication)',
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Like removed or was not liked',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                ok: { type: 'boolean' },
                                unliked: { type: 'boolean', description: 'True if like was removed, false if was not liked' },
                            },
                        },
                    },
                },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Image not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const userUuid = event.context.auth?.uuid;
    if (!userUuid) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const imageId = getRouterParam(event, 'id');
    if (!imageId) {
        throw createError({ statusCode: 400, statusMessage: 'Image ID required' });
    }

    const unliked = unlikeImage(imageId, userUuid);

    return {
        ok: true,
        unliked,
    };
});
