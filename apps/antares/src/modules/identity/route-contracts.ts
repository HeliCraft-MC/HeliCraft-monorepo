import { z } from '@hono/zod-openapi';

import type { Context } from 'hono';

import type { Database } from '../../db';

import type { IdentityService } from './service';
import type { SessionService, Authenticated } from '../sessions/service';
import type { RateLimiter } from '../sessions/security';

const REGISTER_LIMIT = 10;
const LOGIN_LIMIT = 100;
const LOGIN_NAME_LIMIT = 10;
const SuccessSchema = z.object({ success: z.literal(true) }).openapi('Success');
const ErrorSchema = z
  .object({ message: z.string(), code: z.string().optional() })
  .openapi('PlatformError');
interface ApiResponse {
  description: string;
  content: Record<'application/json', { schema: z.ZodType }>;
}
function response(schema: z.ZodType): ApiResponse {
  return { description: 'Result', content: { 'application/json': { schema } } };
}
const errors = {
  400: response(ErrorSchema),
  401: response(ErrorSchema),
  403: response(ErrorSchema),
  409: response(ErrorSchema),
  429: response(ErrorSchema),
  503: response(ErrorSchema),
};
interface AuthConfig {
  readonly siteOrigin: string;
  readonly secureCookies: boolean;
  readonly registrationEnabled: boolean;
}
const SessionSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  userAgent: z.string().nullable(),
  current: z.boolean(),
});
type Services = () => { sessions: SessionService; identity: IdentityService; db: Database['db'] };
type Authenticate = (context: Context) => Promise<Authenticated>;
type SetSessionCookie = (context: Context, token: string) => void;
type ClearSessionCookie = (context: Context) => void;
interface IdentityRuntime {
  readonly services: Services;
  readonly auth: Authenticate;
  readonly cookie: SetSessionCookie;
  readonly clearCookie: ClearSessionCookie;
  readonly limiter: RateLimiter;
  readonly cookieName: string;
  readonly config: AuthConfig;
}

export {
  response,
  errors,
  SuccessSchema,
  SessionSchema,
  REGISTER_LIMIT,
  LOGIN_LIMIT,
  LOGIN_NAME_LIMIT,
  type AuthConfig,
  type IdentityRuntime,
};
