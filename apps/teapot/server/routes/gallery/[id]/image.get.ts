import { useFileService } from '~/utils/file.service'
import { getGalleryImage, canViewImage } from '~/utils/gallery.utils'
import { isUserAdmin } from '~/utils/user.utils'

defineRouteMeta({
  openAPI: {
    tags: ['gallery'],
    description: 'Get gallery image file. Approved images are public, pending/rejected only visible to owner and admins.',
    parameters: [
      { name: 'id', in: 'path', required: true, description: 'Gallery image ID', schema: { type: 'string' } }
    ],
    responses: {
      200: {
        description: 'Image file',
        content: {
          'image/png': { schema: { type: 'string', format: 'binary' } },
          'image/jpeg': { schema: { type: 'string', format: 'binary' } },
          'image/webp': { schema: { type: 'string', format: 'binary' } }
        }
      },
      403: { description: 'Forbidden - Cannot view this image' },
      404: { description: 'Image not found' }
    }
  }
})

/**
 * Attempt to extract user UUID from request (soft auth - doesn't throw if no token)
 */
async function tryGetUserUuid(event: any): Promise<string | null> {
  // Try Authorization header first
  const authHeader = getHeader(event, 'authorization')
  let accessToken: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.replace(/^Bearer\s+/, '')
  }

  // Try cookie fallback
  if (!accessToken) {
    const cookies = parseCookies(event)
    accessToken = cookies['auth.token']
  }

  if (!accessToken) {
    return null
  }

  try {
    const payload = await verifyToken(accessToken) as { UUID?: string }
    const uuid = payload?.UUID
    if (!uuid) return null

    // Verify auth is still valid
    await checkAuth(uuid, accessToken)
    return uuid
  } catch {
    // Invalid token - treat as unauthenticated
    return null
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const image = getGalleryImage(id)

  // Check view permissions with soft auth
  const userUuid = await tryGetUserUuid(event)
  const admin = userUuid ? await isUserAdmin(userUuid) : false

  if (!canViewImage(image, userUuid, admin)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot view this image',
      data: { statusMessageRu: 'Нет доступа к этому изображению' }
    })
  }

  const fileService = useFileService()
  const buf = await fileService.readFile(image.path)

  if (!buf) {
    throw createError({ statusCode: 404, statusMessage: 'Image file not found' })
  }

  event.node.res.setHeader('Content-Length', buf.length.toString())
  event.node.res.setHeader('Content-Type', image.mime)
  event.node.res.setHeader('Cache-Control', 'public, max-age=31536000')

  return send(event, buf, image.mime)
})
