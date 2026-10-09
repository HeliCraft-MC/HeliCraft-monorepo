import { HTTP, DomainError } from '../errors';

const MINUTE_MS = 60_000;
const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * MINUTE_MS;
const MAX_BUCKETS = 4096;
interface Bucket {
  count: number;
  expires: number;
}
class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  public take(key: string, limit: number, now = Date.now()): void {
    this.prune(now);
    const bucket = this.buckets.get(key);
    if (bucket && bucket.expires > now) {
      if (bucket.count >= limit) {
        throw new DomainError(
          HTTP.rateLimited,
          'RATE_LIMITED',
          'Слишком много попыток. Попробуйте позже',
        );
      }
      bucket.count += 1;
      return;
    }
    if (this.buckets.size >= MAX_BUCKETS) {
      throw new DomainError(HTTP.rateLimited, 'RATE_LIMITED', 'Попробуйте позже');
    }
    this.buckets.set(key, { count: 1, expires: now + WINDOW_MS });
  }
  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.expires <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

function validateBrowserMutation(request: Request, siteOrigin: string): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return;
  }
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  // Reject missing Origin, including non-browser clients: automation must send an explicit origin.
  if (origin !== siteOrigin || fetchSite === 'cross-site' || fetchSite === 'same-site') {
    throw new DomainError(HTTP.forbidden, 'CSRF_REJECTED', 'Источник запроса не разрешён');
  }
}

export { RateLimiter, validateBrowserMutation };
