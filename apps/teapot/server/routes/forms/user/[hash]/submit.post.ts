import type { FormSettings, SubmitResponseDto } from '~/interfaces/forms.types';
import { getFormByHash, hasUserResponded, submitResponse } from '~/utils/forms.utils';

defineRouteMeta({
  openAPI: {
    tags: ['forms-user'],
    description: 'Submit form response (Authenticated users)',
    security: [{ bearerAuth: [] }],
  },
});

export default defineEventHandler(async (event) => {
  const hash = event.context.params!.hash;
  const body = await readBody<SubmitResponseDto>(event);

  const result = await getFormByHash(hash);
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found' });
  }

  const { form } = result;

  const user = event.context.auth;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please login to submit.' });
  }

  // Parse settings
  const settings: FormSettings = typeof form.settings === 'string'
    ? JSON.parse(form.settings)
    : (form.settings || {});

  // Check scheduling
  const now = Date.now();
  if (settings.start_date && now < settings.start_date) {
    throw createError({ statusCode: 403, statusMessage: 'Form is not yet open for submissions' });
  }
  if (settings.end_date && now > settings.end_date) {
    throw createError({ statusCode: 403, statusMessage: 'Form submission period has ended' });
  }

  // Check one response per user
  if (settings.one_response_per_user) {
    const alreadyResponded = await hasUserResponded(form.id, user.uuid);
    if (alreadyResponded) {
      throw createError({ statusCode: 409, statusMessage: 'You have already submitted a response to this form' });
    }
  }

  await submitResponse(form.id, user.uuid, body);

  return { ok: true };
});
