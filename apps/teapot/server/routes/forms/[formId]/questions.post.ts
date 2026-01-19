import { createQuestion, getFormById } from '~/utils/forms.utils'
import { isUserAdmin } from '~/utils/user.utils'
import type { CreateQuestionDto } from '~/interfaces/forms.types'

defineRouteMeta({
    openAPI: {
        tags: ['forms'],
        description: 'Add a question to a form (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['type', 'title'],
                        properties: {
                            type: { type: 'string' },
                            title: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
})

export default defineEventHandler(async (event) => {
    const user = event.context.auth
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const isAdmin = await isUserAdmin(user.uuid)
    if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const formId = parseInt(event.context.params!.formId)
    const body = await readBody<CreateQuestionDto>(event)

    const form = await getFormById(formId)
    if (!form) throw createError({ statusCode: 404, statusMessage: 'Form not found' })

    const question = await createQuestion(formId, body)
    return question
})
