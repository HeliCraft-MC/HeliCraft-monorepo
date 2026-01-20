import { deleteQuestion } from '~/utils/forms.utils';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
    openAPI: {
        tags: ['forms'],
        description: 'Delete a question (Admin only)',
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

    const questionId = Number.parseInt(event.context.params!.questionId);

    await deleteQuestion(questionId);

    return { ok: true };
});
