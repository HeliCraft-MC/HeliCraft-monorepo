import { deleteForm, getFormById } from '~/utils/forms.utils'
import { isUserAdmin } from '~/utils/user.utils'

defineRouteMeta({
  openAPI: {
    tags: ['forms'],
    description: 'Delete form (Admin only)',
    security: [{ bearerAuth: [] }],
  },
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const isAdmin = await isUserAdmin(user.uuid)
  if (!isAdmin)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = Number.parseInt(event.context.params!.id)
  const form = await getFormById(id)
  if (!form)
    throw createError({ statusCode: 404, statusMessage: 'Form not found' })

  await deleteForm(id)
  return { ok: true }
})
