import { z } from 'zod';

const MAX_PORT = 65_535;
const DEFAULT_PORT = 3000;
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  DATABASE_URL: z.url(),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1).default('helicraft'),
});
export type Config = z.infer<typeof EnvSchema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}
