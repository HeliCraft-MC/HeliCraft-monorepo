import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

const handler = createStartHandler(defaultStreamHandler);
async function fetchPage(request: Request): Promise<Response> {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const headers = new Headers(request.headers);
  // Replace any incoming value; clients cannot choose the nonce used by the renderer.
  headers.set('x-helicraft-csp-nonce', nonce);
  const response = await handler(new Request(request, { headers }));
  if (import.meta.env.PROD) {
    response.headers.set(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    );
  }
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
const server = { fetch: fetchPage };
// oxlint-disable-next-line import/no-default-export -- TanStack Start requires a default server entry.
export default server;
