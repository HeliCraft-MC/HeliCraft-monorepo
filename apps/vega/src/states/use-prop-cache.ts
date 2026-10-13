import { useMemo } from 'react';

// Dynamic form rows need stable per-row handlers without calling hooks inside a loop.
function usePropCache<Value>(scope: object): (key: string, value: Value) => Value {
  const cache = useMemo(() => ({ scope, values: new Map<string, Value>() }), [scope]);
  function cachedValue(key: string, value: Value): Value {
    const cached = cache.values.get(key);
    if (cached !== undefined) {
      return cached;
    }
    cache.values.set(key, value);
    return value;
  }
  return cachedValue;
}
function rowKey(prefix: string, ...values: readonly unknown[]): string {
  return `${prefix}:${JSON.stringify(
    values.map((value) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof value.id === 'string'
      ) {
        return value.id;
      }
      return '';
    }),
  )}`;
}
export { usePropCache, rowKey };
