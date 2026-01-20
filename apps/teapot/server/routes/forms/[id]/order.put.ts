import { getFormById, reorderQuestions } from '~/utils/forms.utils'
import { isUserAdmin } from '~/utils/user.utils'

defineRouteMeta({
  openAPI: {
    tags: ['forms'],
    description: 'Reorder questions (Admin only)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const isAdmin = await isUserAdmin(user.uuid)
  if (!isAdmin)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const formId = Number.parseInt(event.context.params!.id)
  const questionIds = await readBody<number[]>(event)

  const form = await getFormById(formId)
  if (!form)
    throw createError({ statusCode: 404, statusMessage: 'Form not found' })

  await reorderQuestions(formId, questionIds)

  return { ok: true }
})
