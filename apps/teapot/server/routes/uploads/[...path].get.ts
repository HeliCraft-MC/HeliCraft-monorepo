import { useFileService } from '~/utils/file.service'

defineRouteMeta({
    openAPI: {
        tags: ['uploads'],
        description: 'Serve uploaded files (forms, misc, etc.)',
        parameters: [
            { name: 'path', in: 'path', required: true, description: 'File path relative to uploads directory', schema: { type: 'string' } }
        ],
        responses: {
            200: {
                description: 'File content',
                content: {
                    'image/png': { schema: { type: 'string', format: 'binary' } },
                    'image/jpeg': { schema: { type: 'string', format: 'binary' } },
                    'image/webp': { schema: { type: 'string', format: 'binary' } },
                    'image/gif': { schema: { type: 'string', format: 'binary' } },
                    'application/octet-stream': { schema: { type: 'string', format: 'binary' } }
                }
            },
            404: { description: 'File not found' }
        }
    }
})

// MIME type lookup by extension
const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'pdf': 'application/pdf',
    'json': 'application/json',
    'txt': 'text/plain',
}

function getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    return mimeTypes[ext] || 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
    // Get the path segments from the catch-all param
    const pathParam = getRouterParam(event, 'path')
    if (!pathParam) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
    }

    // Decode URL-encoded characters and normalize path
    const relativePath = decodeURIComponent(pathParam)

    // Read file using FileService (includes path traversal protection)
    const fileService = useFileService()

    let buf: Buffer | null
    try {
        buf = await fileService.readFile(relativePath)
    } catch (err: any) {
        // Path traversal or other validation error
        if (err.message?.includes('traversal')) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }
        throw err
    }

    if (!buf) {
        throw createError({
            statusCode: 404,
            statusMessage: 'File not found',
            data: { path: relativePath }
        })
    }

    const mime = getMimeType(relativePath)

    // Set cache headers - uploaded content can be cached
    event.node.res.setHeader('Content-Length', buf.length.toString())
    event.node.res.setHeader('Content-Type', mime)
    event.node.res.setHeader('Cache-Control', 'public, max-age=2592000, immutable')

    return send(event, buf, mime)
})
