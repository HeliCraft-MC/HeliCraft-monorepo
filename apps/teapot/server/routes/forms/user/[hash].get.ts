import type { RowDataPacket } from 'mysql2';
import type { FormSettings } from '~/interfaces/forms.types';
import { useMySQL } from '~/plugins/mySql';
import { getFormByHash, hasUserResponded } from '~/utils/forms.utils';

defineRouteMeta({
  openAPI: {
    tags: ['forms-user'],
    description: 'Get form structure (User)',
    responses: {
      200: { description: 'Form structure' },
      404: { description: 'Form not found' },
    },
  },
});

export default defineEventHandler(async (event) => {
  const hash = event.context.params!.hash;
  const user = event.context.auth;

  // First try to find the form regardless of status
  const pool = useMySQL('forms');
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM forms WHERE public_hash = ?',
    [hash],
  );
  const formRow = rows[0];

  if (!formRow) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found' });
  }

  // Parse settings
  const settings: FormSettings = typeof formRow.settings === 'string'
    ? JSON.parse(formRow.settings)
    : (formRow.settings || {});

  const now = Date.now();

  // Determine availability status
  let availability: 'open' | 'closed' | 'not_started' | 'ended' | 'already_submitted' = 'open';
  let availabilityMessage: string | null = null;

  if (formRow.status === 'closed') {
    availability = 'closed';
    availabilityMessage = 'Эта форма закрыта для ответов';
  }
  else if (formRow.status !== 'published') {
    throw createError({ statusCode: 404, statusMessage: 'Form not found' });
  }
  else if (settings.start_date && now < settings.start_date) {
    availability = 'not_started';
    availabilityMessage = `Форма откроется ${new Date(settings.start_date).toLocaleString('ru-RU')}`;
  }
  else if (settings.end_date && now > settings.end_date) {
    availability = 'ended';
    availabilityMessage = 'Приём ответов на эту форму завершён';
  }

  // Check if user already submitted (if logged in)
  let hasResponded = false;
  if (user && settings.one_response_per_user) {
    hasResponded = await hasUserResponded(formRow.id, user.uuid);
    if (hasResponded && availability === 'open') {
      availability = 'already_submitted';
      availabilityMessage = 'Вы уже отправили ответ на эту форму';
    }
  }

  // Get questions only if form can be viewed
  const result = await getFormByHash(hash);
  const questions = result?.questions || [];

  return {
    form: {
      id: formRow.id,
      title: formRow.title,
      description: formRow.description,
      status: formRow.status,
    },
    questions,
    availability,
    availability_message: availabilityMessage,
    has_responded: hasResponded,
  };
});
