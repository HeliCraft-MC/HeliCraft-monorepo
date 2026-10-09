import { describe, expect, it } from 'vitest';
import { validateBrowserMutation, RateLimiter } from '../src/modules/sessions/security';
import { permissionsFor, requirePermission } from '../src/modules/permissions/policy';

describe('browser security boundaries', () => {
  it('rejects missing, cross-site and sibling-site origins on mutations', () => {
    const origin = 'https://helicraft.test';
    const invalidHeaders: HeadersInit[] = [
      {},
      { Origin: 'https://evil.test' },
      { Origin: origin, 'Sec-Fetch-Site': 'same-site' },
      { Origin: origin, 'Sec-Fetch-Site': 'cross-site' },
    ];
    for (const headers of invalidHeaders) {
      expect(() => {
        validateBrowserMutation(
          new Request(`${origin}/api/v1/auth/login`, { method: 'POST', headers }),
          origin,
        );
      }).toThrow('Источник запроса');
    }
    expect(() => {
      validateBrowserMutation(
        new Request(`${origin}/api/v1/auth/login`, {
          method: 'POST',
          headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin' },
        }),
        origin,
      );
    }).not.toThrow();
  });
  it('limits repeated attempts and permits them only after the window expires', () => {
    const limiter = new RateLimiter();
    limiter.take('username', 2, 0);
    limiter.take('username', 2, 1);
    expect(() => {
      limiter.take('username', 2, 2);
    }).toThrow('Слишком много попыток');
    expect(() => {
      limiter.take('username', 2, 900_001);
    }).not.toThrow();
  });
  it('separates editor, moderator and administrative privileges', () => {
    expect(permissionsFor(['PLAYER'])).toStrictEqual([]);
    expect(() => {
      requirePermission(['EDITOR'], 'content.publish');
    }).not.toThrow();
    expect(() => {
      requirePermission(['EDITOR'], 'users.roles.manage');
    }).toThrow('Недостаточно полномочий');
    expect(() => {
      requirePermission(['MODERATOR'], 'content.publish');
    }).toThrow('Недостаточно полномочий');
    expect(() => {
      requirePermission(['ADMIN'], 'users.roles.manage');
    }).not.toThrow();
  });
});
