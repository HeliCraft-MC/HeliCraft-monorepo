import { likeImage } from '~/utils/gallery.utils';

defineRouteMeta({
    openAPI: {
        tags: ['gallery'],
        description: 'Like a gallery image (requires authentication)',
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Like added or already exists',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                ok: { type: 'boolean' },
                                liked: { type: 'boolean', description: 'True if like was newly added, false if already liked' },
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

    const liked = likeImage(imageId, userUuid);

    return {
        ok: true,
        liked,
    };
});
