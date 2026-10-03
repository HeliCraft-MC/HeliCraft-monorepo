// Exercise the same Bun server used by the Vega production container.
process.env.STATIC_ROOT = 'apps/vega/dist';
process.env.PORT = '8080';
process.env.API_PROXY_TARGET = 'http://localhost:3000';
await import('../../infra/serve-vega');
