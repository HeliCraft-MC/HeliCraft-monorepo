import { createHash } from 'node:crypto';

const lock: unknown = await Bun.file('server-lock.json').json();
if (
  typeof lock !== 'object' ||
  lock === null ||
  !('url' in lock) ||
  typeof lock.url !== 'string' ||
  !('sha256' in lock) ||
  typeof lock.sha256 !== 'string'
) {
  throw new Error('Invalid server lock');
}
const response = await fetch(lock.url, {
  headers: { 'User-Agent': 'HeliCraft/0.1.0 (https://github.com/ms0ur/HeliCraft-monorepo)' },
});
if (!response.ok) {
  throw new Error(`Server download HTTP ${response.status}`);
}
const bytes = await response.arrayBuffer();
if (createHash('sha256').update(new Uint8Array(bytes)).digest('hex') !== lock.sha256) {
  throw new Error('Server checksum mismatch');
}
await Bun.write('server.jar', bytes);
