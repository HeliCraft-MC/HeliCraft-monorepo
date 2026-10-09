import { z } from 'zod';

const MAX_PORT = 65_535;
const DEFAULT_PORT = 3000;
const MAX_MINECRAFT_ADDRESS = 255;
const MAX_LINK_LABEL = 80;
const CommunityLinks = z
  .string()
  .default('[]')
  .transform((value, context): unknown => {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed;
    } catch {
      context.addIssue({ code: 'custom', message: 'COMMUNITY_LINKS must be JSON' });
      return z.NEVER;
    }
  })
  .pipe(
    z.array(
      z.strictObject({
        label: z.string().trim().min(1).max(MAX_LINK_LABEL),
        url: z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
      }),
    ),
  );
const EnvSchema = z
  .object({
    COMMUNITY_LINKS: CommunityLinks,
    PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
    DATABASE_URL: z.url().refine((value) => {
      const url = new URL(value);
      return ['postgres:', 'postgresql:'].includes(url.protocol) && url.pathname === '/helicraft';
    }, 'DATABASE_URL must target PostgreSQL database helicraft'),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1).default('helicraft'),
    SITE_ORIGIN: z
      .url()
      .default('http://localhost:5173')
      .refine(
        (value) => new URL(value).origin === value,
        'SITE_ORIGIN must be an origin without a path',
      ),
    SECURE_COOKIES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    REGISTRATION_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    SITE_PHASE: z.enum(['PRELAUNCH', 'OPEN']).default('PRELAUNCH'),
    MINECRAFT_ADDRESS: z
      .string()
      .trim()
      .max(MAX_MINECRAFT_ADDRESS)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .refine((value) => !value.SITE_ORIGIN.startsWith('https:') || value.SECURE_COOKIES, {
    path: ['SECURE_COOKIES'],
    message: 'HTTPS requires SECURE_COOKIES=true',
  });
export type Config = z.infer<typeof EnvSchema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}
