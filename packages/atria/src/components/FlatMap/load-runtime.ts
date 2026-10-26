import type { createFlatMap } from './runtime';

async function loadRuntime(): Promise<{ createFlatMap: typeof createFlatMap }> {
  return await import('./runtime');
}
export { loadRuntime };
