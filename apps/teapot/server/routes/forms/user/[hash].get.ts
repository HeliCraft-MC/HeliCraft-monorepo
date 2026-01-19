import { getFormByHash } from '~/utils/forms.utils'

defineRouteMeta({
    openAPI: {
        tags: ['forms-user'],
        description: 'Get form structure (User)',
        responses: {
            200: { description: 'Form structure' },
            404: { description: 'Form not found' }
        }
    }
})

export default defineEventHandler(async (event) => {
    const hash = event.context.params!.hash

    const result = await getFormByHash(hash)
    if (!result) {
        throw createError({ statusCode: 404, statusMessage: 'Form not found' })
    }

    return result
})
