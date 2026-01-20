import { getForms } from '~/utils/forms.utils'
import { isUserAdmin } from '~/utils/user.utils'

defineRouteMeta({
  openAPI: {
    tags: ['forms'],
    description: 'List all forms (Admin only)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'List of forms' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const isAdmin = await isUserAdmin(user.uuid)
  if (!isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admins only' })
  }

  const forms = await getForms()
  return forms
})
