import type { CreateFormDto } from '~/interfaces/forms.types';
import { createForm } from '~/utils/forms.utils';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
    openAPI: {
        tags: ['forms'],
        description: 'Create a new form (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
            201: { description: 'Form created' },
            403: { description: 'Forbidden' },
        },
    },
});

export default defineEventHandler(async (event) => {
    const user = event.context.auth;
    if (!user)
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

    const isAdmin = await isUserAdmin(user.uuid);
    if (!isAdmin) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admins only' });
    }

    const body = await readBody<CreateFormDto>(event);
    const form = await createForm(user.uuid, body);
    return form;
});
