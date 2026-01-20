import { deleteResponse } from '~/utils/forms.utils';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
    openAPI: {
        tags: ['forms-analytics'],
        description: 'Delete a form response (Admin only)',
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

    const responseId = Number.parseInt(event.context.params!.responseId);
    if (isNaN(responseId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid response ID' });
    }

    await deleteResponse(responseId);

    return { ok: true };
});
