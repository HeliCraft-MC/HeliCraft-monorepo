import { createHash } from 'node:crypto';
import type { StateConfiguration } from './contracts';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item: unknown) => canonicalJson(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    // oxlint-disable-next-line unicorn/no-array-sort -- This freshly allocated key array is sorted locally for ES2022-compatible canonical serialization.
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
function configurationHash(configuration: Readonly<StateConfiguration>): string {
  return createHash('sha256').update(canonicalJson(configuration)).digest('hex');
}
export { configurationHash };
