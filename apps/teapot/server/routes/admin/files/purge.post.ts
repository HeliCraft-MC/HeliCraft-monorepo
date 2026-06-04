import { purgeOrphanedFiles } from '~/utils/file.service';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
    openAPI: {
        tags: ['admin-files'],
        description: 'Purge (delete) orphaned files with ref_count = 0',
        security: [{ bearerAuth: [] }],
    },
});

export default defineEventHandler(async (event) => {
    const user = event.context.auth;
    if (!user)
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

    const isAdmin = await isUserAdmin(user.uuid);
    if (!isAdmin)
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

    const deletedCount = await purgeOrphanedFiles();

    return {
        ok: true,
        deleted: deletedCount,
    };
});
