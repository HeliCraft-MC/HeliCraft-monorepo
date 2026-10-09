// Exercise the same Bun server used by the Vega production container.
process.env.VEGA_BUILD_ROOT = 'apps/vega/dist';
process.env.PORT = '8085';
process.env.API_PROXY_TARGET = 'http://localhost:3101';
await import('../../infra/serve-vega');
