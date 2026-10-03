import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';
const staticFiles = new Map([
  ['/', { file: './public/index.html', type: 'text/html; charset=utf-8', cache: 'no-cache' }],
  ['/styles.css', { file: './public/styles.css', type: 'text/css; charset=utf-8' }],
  ['/app.js', { file: './public/app.js', type: 'text/javascript; charset=utf-8' }],
  ['/logo.png', { file: './public/logo.png', type: 'image/png' }],
]);

const screenshotDirectory = new URL('./public/screenshots/', import.meta.url);
const screenshots = (await readdir(screenshotDirectory))
  .filter(file => /\.(jpe?g|png|webp)$/i.test(file))
  .sort();

staticFiles.set('/screenshots.json', {
  type: 'application/json; charset=utf-8',
  cache: 'no-cache',
  body: Buffer.from(JSON.stringify(screenshots.map(file => `/screenshots/${encodeURIComponent(file)}`))),
});

for (const file of screenshots) {
  staticFiles.set(`/screenshots/${encodeURIComponent(file)}`, {
    file: `./public/screenshots/${file}`,
    type: /\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg',
    cache: 'public, max-age=604800',
  });
}

for (const asset of staticFiles.values()) {
  if (asset.file)
    asset.body = await readFile(new URL(asset.file, import.meta.url));
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const server = createServer((request, response) => {
  const method = request.method ?? 'GET';

  if (method !== 'GET' && method !== 'HEAD') {
    response.writeHead(405, { ...securityHeaders, Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/healthz') {
    response.writeHead(200, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(method === 'HEAD' ? undefined : 'ok');
    return;
  }

  const asset = staticFiles.get(pathname);
  if (!asset) {
    response.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(method === 'HEAD' ? undefined : 'Not found');
    return;
  }

  response.writeHead(200, {
    ...securityHeaders,
    'Content-Type': asset.type,
    'Cache-Control': asset.cache ?? 'public, max-age=86400',
  });
  response.end(method === 'HEAD' ? undefined : asset.body);
});

server.listen(port, host, () => {
  console.log(`HeliCraft coming-soon app listening on ${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
