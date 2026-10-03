import path from 'node:path';

const { resolve, sep } = path;

const DEFAULT_PORT = 8080;
const UPSTREAM_TIMEOUT_MS = 15_000;
const root = resolve(process.env.STATIC_ROOT ?? './dist');
const upstream = new URL(process.env.API_PROXY_TARGET ?? 'http://antares:3000');
const port = Number(process.env.PORT ?? DEFAULT_PORT);
async function proxy(request: Request, url: URL): Promise<Response> {
  const target = new URL(url.pathname + url.search, upstream);
  const headers = new Headers(request.headers);
  headers.delete('host');
  try {
    const response = await fetch(
      new Request(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      }),
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    );
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: 'Antares unavailable' }, { status: 502 });
  }
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/openapi.json') {
      return await proxy(request, url);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }
    let filePath = root;
    try {
      filePath = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      return new Response('Forbidden', { status: 403 });
    }
    let file = Bun.file(filePath === root ? resolve(root, 'index.html') : filePath);
    if (!(await file.exists())) {
      if (request.headers.get('accept')?.includes('text/html') !== true) {
        return new Response('Not found', { status: 404 });
      }
      file = Bun.file(resolve(root, 'index.html'));
    }
    return new Response(request.method === 'HEAD' ? null : file, {
      headers: {
        'Content-Type': file.type,
        'Cache-Control': url.pathname.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
});
