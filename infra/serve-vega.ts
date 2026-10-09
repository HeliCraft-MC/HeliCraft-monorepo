import path from 'node:path';

const { resolve, sep } = path;
const DEFAULT_PORT = 8080;
const UPSTREAM_TIMEOUT_MS = 15_000;
const buildRoot = resolve(process.env.VEGA_BUILD_ROOT ?? './dist');
const root = resolve(buildRoot, 'client');
const upstream = new URL(process.env.API_PROXY_TARGET ?? 'http://antares:3000');
const port = Number(process.env.PORT ?? DEFAULT_PORT);
interface SsrModule {
  readonly default: { readonly fetch: (request: Request) => Promise<Response> };
}
// The entry is generator-owned; check its runtime boundary before serving requests.
const entry: unknown = await import(resolve(buildRoot, 'server/server.js'));
function isSsrModule(value: unknown): value is SsrModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'default' in value &&
    typeof value.default === 'object' &&
    value.default !== null &&
    'fetch' in value.default &&
    typeof value.default.fetch === 'function'
  );
}
if (!isSsrModule(entry)) {
  throw new Error('Invalid Vega SSR build');
}
const render = entry.default.fetch;

async function proxy(request: Request, url: URL): Promise<Response> {
  const target = new URL(url.pathname + url.search, upstream);
  const headers = new Headers(request.headers);
  headers.delete('host');
  // Never pass user-supplied forwarding headers to the API.
  headers.delete('x-forwarded-for');
  headers.delete('x-real-ip');
  try {
    return await fetch(
      new Request(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      }),
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    );
  } catch {
    return Response.json({ message: 'Antares unavailable' }, { status: 502 });
  }
}

async function staticResponse(request: Request, url: URL): Promise<Response | undefined> {
  let filePath = root;
  try {
    filePath = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!filePath.startsWith(root + sep)) {
    return undefined;
  }
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return undefined;
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
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') {
      const target = new URL(`/api/v1/public${url.pathname}`, url);
      return await proxy(request, target);
    }
    if (url.pathname.startsWith('/api/') || url.pathname === '/openapi.json') {
      return await proxy(request, url);
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const asset = await staticResponse(request, url);
      if (asset) {
        return asset;
      }
    }
    const response = await render(request);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (response.status === 404 || /^\/(?:app|admin|login|register)(?:\/|$)/u.test(url.pathname)) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
  },
});
