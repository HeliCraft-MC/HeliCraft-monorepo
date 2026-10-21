interface ObservedRequest {
  readonly path: string;
  readonly cookie: string | null;
  readonly query: Record<string, string>;
}
function isObservedRequest(value: unknown): value is ObservedRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'cookie' in value &&
    (value.cookie === null || typeof value.cookie === 'string') &&
    'query' in value &&
    typeof value.query === 'object' &&
    value.query !== null &&
    !Array.isArray(value.query) &&
    Object.values(value.query).every((item) => typeof item === 'string')
  );
}
function parseObservations(value: unknown): { observations: ObservedRequest[] } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('observations' in value) ||
    !Array.isArray(value.observations)
  ) {
    throw new Error('Invalid observed public requests');
  }
  const observations: unknown[] = value.observations;
  if (!observations.every((item) => isObservedRequest(item))) {
    throw new Error('Invalid observed public request fields');
  }
  return { observations };
}
export { parseObservations };
