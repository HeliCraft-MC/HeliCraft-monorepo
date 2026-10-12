import { createServer } from 'node:net';

const MAX_ATTEMPTS = 20;
const MAX_PORT = 65_535;
async function canListen(port: number): Promise<boolean> {
  const { promise, resolve, reject } = Promise.withResolvers<boolean>();
  const server = createServer();
  server.once('error', (error: NodeJS.ErrnoException): void => {
    if (error.code === 'EADDRINUSE') {
      resolve(false);
    } else {
      reject(error);
    }
  });
  server.listen(port, '0.0.0.0', (): void => {
    server.close((): void => {
      resolve(true);
    });
  });
  return await promise;
}
async function availablePort(preferred: number): Promise<number> {
  if (!Number.isInteger(preferred) || preferred < 1 || preferred > MAX_PORT) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  for (let port = preferred; port < Math.min(preferred + MAX_ATTEMPTS, MAX_PORT + 1); port += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Probe sequentially to choose the first free port without reserving additional sockets.
    if (await canListen(port)) {
      return port;
    }
  }
  throw new Error(`No free API port found starting at ${preferred}. Set PORT to a free port.`);
}
export { availablePort, canListen };
