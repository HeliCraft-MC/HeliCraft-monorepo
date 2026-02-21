import { getFormById, getQuestions } from '~/utils/forms.utils';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
    openAPI: {
        tags: ['forms'],
        description: 'Get form details (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
            200: { description: 'Form details' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const user = event.context.auth;
    if (!user)
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

    const isAdmin = await isUserAdmin(user.uuid);
    if (!isAdmin)
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

    const id = Number.parseInt(event.context.params!.id);
    const form = await getFormById(id);

    if (!form) {
        throw createError({ statusCode: 404, statusMessage: 'Form not found' });
    }

    const questions = await getQuestions(id);

    return {
        ...form,
        questions,
    };
});
