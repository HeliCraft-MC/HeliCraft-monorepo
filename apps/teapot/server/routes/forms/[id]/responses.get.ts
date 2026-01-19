import { getFormById, getQuestions } from '~/utils/forms.utils'
import { isUserAdmin } from '~/utils/user.utils'
import { useMySQL } from '~/plugins/mySql'
import type { RowDataPacket } from 'mysql2'

defineRouteMeta({
    openAPI: {
        tags: ['forms-analytics'],
        description: 'Get detailed form responses with answers (Admin only)',
        security: [{ bearerAuth: [] }]
    }
})

interface ResponseWithAnswers {
    id: number;
    respondent_uuid: string;
    respondent_nickname: string;
    submitted_at: number;
    answers: Record<string, string | string[]>;
}

export default defineEventHandler(async (event) => {
    const user = event.context.auth
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const isAdmin = await isUserAdmin(user.uuid)
    if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const id = parseInt(event.context.params!.id)
    const form = await getFormById(id)
    if (!form) throw createError({ statusCode: 404, statusMessage: 'Form not found' })

    const pool = useMySQL('forms')

    // Get questions for this form
    const questions = await getQuestions(id)

    // Get all responses with respondent info
    const [responses] = await pool.execute<RowDataPacket[]>(
        `SELECT r.id, r.respondent_uuid, r.submitted_at, u.nickname as respondent_nickname
         FROM responses r
         LEFT JOIN helicraft.users u ON r.respondent_uuid = u.uuid
         WHERE r.form_id = ?
         ORDER BY r.submitted_at DESC`,
        [id]
    )

    // Get all answers for these responses
    const responseIds = responses.map(r => r.id)
    if (responseIds.length === 0) {
        return {
            form: { id: form.id, title: form.title, status: form.status },
            questions: questions.filter(q => !['image_block', 'text_block'].includes(q.type)).map(q => ({
                id: q.id,
                uuid: q.uuid,
                title: q.title,
                type: q.type,
                order_index: q.order_index,
                options: q.options
            })),
            responses: []
        }
    }

    const [answers] = await pool.execute<RowDataPacket[]>(
        `SELECT a.response_id, a.question_id, a.value, q.uuid as question_uuid
         FROM answers a
         JOIN questions q ON a.question_id = q.id
         WHERE a.response_id IN (${responseIds.join(',')})`,
    )

    // Group answers by response
    const answersByResponse = new Map<number, Record<string, string | string[]>>()
    for (const answer of answers) {
        if (!answersByResponse.has(answer.response_id)) {
            answersByResponse.set(answer.response_id, {})
        }
        const responseAnswers = answersByResponse.get(answer.response_id)!
        // Try to parse JSON for array values (checkboxes)
        let value = answer.value
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) value = parsed
        } catch { }
        responseAnswers[answer.question_uuid] = value
    }

    const responsesWithAnswers: ResponseWithAnswers[] = responses.map(r => ({
        id: r.id,
        respondent_uuid: r.respondent_uuid,
        respondent_nickname: r.respondent_nickname || 'Unknown',
        submitted_at: r.submitted_at,
        answers: answersByResponse.get(r.id) || {}
    }))

    return {
        form: { id: form.id, title: form.title, status: form.status },
        questions: questions.filter(q => !['image_block', 'text_block'].includes(q.type)).map(q => ({
            id: q.id,
            uuid: q.uuid,
            title: q.title,
            type: q.type,
            order_index: q.order_index,
            options: q.options
        })),
        responses: responsesWithAnswers
    }
})
