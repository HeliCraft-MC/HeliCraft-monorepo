import { getOrphanedFiles } from '~/utils/file.service'
import { isUserAdmin } from '~/utils/user.utils'

defineRouteMeta({
    openAPI: {
        tags: ['admin-files'],
        description: 'Get orphaned files (ref_count = 0) pending deletion',
        security: [{ bearerAuth: [] }]
    }
})

export default defineEventHandler(async (event) => {
    const user = event.context.auth
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const isAdmin = await isUserAdmin(user.uuid)
    if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const orphaned = await getOrphanedFiles()

    return {
        count: orphaned.length,
        files: orphaned.map(f => ({
            hash: f.hash,
            path: f.path,
            size: f.size,
            mime: f.mime,
            last_used: f.last_used_at
        }))
    }
})
