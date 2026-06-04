import type { FormSettings } from '~/interfaces/forms.types';
import { getAvailableForms, getUserResponsesForForms } from '~/utils/forms.utils';

defineRouteMeta({
    openAPI: {
        tags: ['forms-user'],
        description: 'Get available forms for authenticated user',
        security: [{ bearerAuth: [] }],
    },
});

export default defineEventHandler(async (event) => {
    const user = event.context.auth;
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const forms = await getAvailableForms();
    const formIds = forms.map(f => f.id);
    const responded = await getUserResponsesForForms(user.uuid, formIds);

    return forms.map((form) => {
        const settings: FormSettings = typeof form.settings === 'string'
            ? JSON.parse(form.settings)
            : (form.settings || {});

        const hasResponded = responded.get(form.id) || false;
        const canSubmit = !hasResponded || !settings.one_response_per_user;

        return {
            id: form.id,
            title: form.title,
            description: form.description,
            public_hash: form.public_hash,
            created_at: form.created_at,
            has_responded: hasResponded,
            can_submit: canSubmit,
        };
    });
});
