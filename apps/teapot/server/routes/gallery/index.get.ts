import type { GallerySortBy } from '~/interfaces/gallery.types';
import { listGalleryImages } from '~/utils/gallery.utils';

defineRouteMeta({
    openAPI: {
        tags: ['gallery'],
        description: 'List approved gallery images with pagination, filters, search and sorting',
        parameters: [
            { name: 'page', in: 'query', description: 'Page number (default 1)', schema: { type: 'integer', minimum: 1 } },
            { name: 'perPage', in: 'query', description: 'Items per page (default 20, max 100)', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { name: 'category', in: 'query', description: 'Filter by category', schema: { type: 'string' } },
            { name: 'season', in: 'query', description: 'Filter by season', schema: { type: 'string' } },
            { name: 'search', in: 'query', description: 'Search in description and involved players', schema: { type: 'string' } },
            { name: 'date_from', in: 'query', description: 'Filter by date (Unix timestamp, from)', schema: { type: 'integer' } },
            { name: 'date_to', in: 'query', description: 'Filter by date (Unix timestamp, to)', schema: { type: 'integer' } },
            { name: 'sort', in: 'query', description: 'Sort by: created_at (default), likes, updated_at', schema: { type: 'string', enum: ['created_at', 'likes', 'updated_at'] } },
        ],
        responses: {
            200: {
                description: 'List of approved gallery images',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                items: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/GalleryImagePublic' },
                                },
                                total: { type: 'integer' },
                                page: { type: 'integer' },
                                perPage: { type: 'integer' },
                                totalPages: { type: 'integer' },
                            },
                        },
                    },
                },
            },
        },
    },
});

export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    const page = Math.max(1, Number.parseInt(query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(query.perPage as string) || 20));
    const category = query.category as string | undefined;
    const season = query.season as string | undefined;
    const search = query.search as string | undefined;
    const dateFrom = query.date_from ? Number.parseInt(query.date_from as string) : undefined;
    const dateTo = query.date_to ? Number.parseInt(query.date_to as string) : undefined;
    const sortBy = (query.sort as GallerySortBy) || 'created_at';

    // Get current user UUID if authenticated (for is_liked field)
    const currentUserUuid = event.context.auth?.uuid;

    return await listGalleryImages(
        {
            status: 'approved',
            category,
            season,
            search,
            date_from: dateFrom,
            date_to: dateTo,
        },
        page,
        perPage,
        true,
        sortBy,
        currentUserUuid,
    );
});
