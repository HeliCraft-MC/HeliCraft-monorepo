import { getFormByHash, submitResponse } from '~/utils/forms.utils'
import type { SubmitResponseDto } from '~/interfaces/forms.types'

defineRouteMeta({
    openAPI: {
        tags: ['forms-user'],
        description: 'Submit form response (Authenticated users)',
        security: [{ bearerAuth: [] }]
    }
})

export default defineEventHandler(async (event) => {
    const hash = event.context.params!.hash
    const body = await readBody<SubmitResponseDto>(event)

    const result = await getFormByHash(hash)
    if (!result) {
        throw createError({ statusCode: 404, statusMessage: 'Form not found' })
    }

    const { form } = result

    const user = event.context.auth
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please login to submit.' })
    }

    await submitResponse(form.id, user.uuid, body)

    return { ok: true }
})
