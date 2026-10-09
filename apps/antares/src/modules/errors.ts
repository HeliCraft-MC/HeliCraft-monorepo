const HTTP = {
  ok: 200,
  badRequest: 400,
  unauthenticated: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  tooLarge: 413,
  rateLimited: 429,
  unavailable: 503,
} as const;
type ErrorStatus = Exclude<(typeof HTTP)[keyof typeof HTTP], typeof HTTP.ok>;
class DomainError extends Error {
  public readonly status: ErrorStatus;
  public readonly code: string;
  public constructor(status: ErrorStatus, code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
  }
}
function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    (('code' in error && error.code === '23505') ||
      ('cause' in error && isUniqueConflict(error.cause)))
  );
}

export { HTTP, DomainError, isUniqueConflict, type ErrorStatus };
