import type { RowDataPacket } from 'mysql2';
import { useMySQL } from '~/plugins/mySql';
import { getFormById, getQuestions } from '~/utils/forms.utils';
import { isUserAdmin } from '~/utils/user.utils';

defineRouteMeta({
  openAPI: {
    tags: ['forms-analytics'],
    description: 'Get detailed form responses with answers (Admin only)',
    security: [{ bearerAuth: [] }],
  },
});

interface ResponseWithAnswers {
  id: number;
  respondent_uuid: string;
  respondent_nickname: string;
  submitted_at: number;
  answers: Record<string, string | string[]>;
}

export default defineEventHandler(async (event) => {
  const user = event.context.auth;
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  const isAdmin = await isUserAdmin(user.uuid);
  if (!isAdmin)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

  const id = Number.parseInt(event.context.params!.id);
  const form = await getFormById(id);
  if (!form)
    throw createError({ statusCode: 404, statusMessage: 'Form not found' });

  const formsPool = useMySQL('forms');
  const defaultPool = useMySQL('default');

  // Get questions for this form
  const questions = await getQuestions(id);

  // Get all responses
  const [responses] = await formsPool.execute<RowDataPacket[]>(
    `SELECT id, respondent_uuid, submitted_at
         FROM responses
         WHERE form_id = ?
         ORDER BY submitted_at DESC`,
    [id],
  );

  if (responses.length === 0) {
    return {
      form: { id: form.id, title: form.title, status: form.status },
      questions: questions.filter(q => !['image_block', 'text_block'].includes(q.type)).map(q => ({
        id: q.id,
        uuid: q.uuid,
        title: q.title,
        type: q.type,
        order_index: q.order_index,
        options: q.options,
      })),
      responses: [],
    };
  }

  // Get nicknames for respondents from default database
  const uuids = responses.map(r => r.respondent_uuid);
  const [users] = await defaultPool.execute<RowDataPacket[]>(
    `SELECT UUID, NICKNAME FROM AUTH WHERE UUID IN (${uuids.map(() => '?').join(',')})`,
    uuids,
  );

  const nicknameMap = new Map<string, string>();
  for (const user of users) {
    nicknameMap.set(user.UUID, user.NICKNAME);
  }

  // Get all answers for these responses
  const responseIds = responses.map(r => r.id);

  const [answers] = await formsPool.execute<RowDataPacket[]>(
    `SELECT a.response_id, a.question_id, a.value, q.uuid as question_uuid
         FROM answers a
         JOIN questions q ON a.question_id = q.id
         WHERE a.response_id IN (${responseIds.join(',')})`,
  );

  // Group answers by response
  const answersByResponse = new Map<number, Record<string, string | string[]>>();
  for (const answer of answers) {
    if (!answersByResponse.has(answer.response_id)) {
      answersByResponse.set(answer.response_id, {});
    }
    const responseAnswers = answersByResponse.get(answer.response_id)!;
    // Try to parse JSON for array values (checkboxes)
    let value = answer.value;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        value = parsed;
    }
    catch { }
    responseAnswers[answer.question_uuid] = value;
  }

  const responsesWithAnswers: ResponseWithAnswers[] = responses.map(r => ({
    id: r.id,
    respondent_uuid: r.respondent_uuid,
    respondent_nickname: nicknameMap.get(r.respondent_uuid) || 'Unknown',
    submitted_at: r.submitted_at,
    answers: answersByResponse.get(r.id) || {},
  }));

  return {
    form: { id: form.id, title: form.title, status: form.status },
    questions: questions.filter(q => !['image_block', 'text_block'].includes(q.type)).map(q => ({
      id: q.id,
      uuid: q.uuid,
      title: q.title,
      type: q.type,
      order_index: q.order_index,
      options: q.options,
    })),
    responses: responsesWithAnswers,
  };
});
