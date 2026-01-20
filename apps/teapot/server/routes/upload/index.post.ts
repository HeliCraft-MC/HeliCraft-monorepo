import { fileTypeFromBuffer } from 'file-type';
import { useFileService } from '~/utils/file.service';

defineRouteMeta({
  openAPI: {
    tags: ['upload'],
    description: 'Generic file upload (Authorized users only)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
              context: { type: 'string', description: 'Optional context folder (e.g. forms, content)' },
            },
            required: ['file'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'File uploaded successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                file: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    path: { type: 'string' },
                    mime: { type: 'string' },
                    size: { type: 'number' },
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
    },
  },
});

export default defineEventHandler(async (event) => {
  // 1. Auth check
  const user = event.context.auth;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // 2. Read multipart
  const parts = await readMultipartFormData(event);
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' });
  }

  const filePart = parts.find(p => p.name === 'file' || !p.name);
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'No file content' });
  }

  const contextPart = parts.find(p => p.name === 'context');
  const context = contextPart?.data?.toString() || 'misc';

  // Validate context to prevent spamming random root folders
  const allowedContexts = ['forms', 'gallery', 'misc', 'avatars'];
  const subDir = allowedContexts.includes(context) ? context : 'misc';

  // 3. Determine extension/mime
  const ft = await fileTypeFromBuffer(filePart.data);
  const extension = ft?.ext || 'bin';
  const mime = ft?.mime || 'application/octet-stream';

  // 4. Save file
  const fileService = useFileService();

  try {
    const fileMeta = await fileService.saveFile(filePart.data, {
      subDir,
      extension,
    });

    const config = useRuntimeConfig();
    const publicUrl = `${config.publicApiUrl}/uploads/${fileMeta.path}`;

    return {
      ok: true,
      file: {
        ...fileMeta,
        url: publicUrl,
      },
    };
  }
  catch (err: any) {
    console.error('Upload failed:', err);
    throw createError({ statusCode: 500, statusMessage: 'File save failed' });
  }
});
