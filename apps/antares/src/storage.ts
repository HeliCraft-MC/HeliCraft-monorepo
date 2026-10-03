import { S3Client } from '@aws-sdk/client-s3';
import type { Config } from './config';

const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;
export function createStorage(config: Config): S3Client {
  return new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    requestHandler: { requestTimeout: REQUEST_TIMEOUT_MS },
    maxAttempts: MAX_ATTEMPTS,
  });
}
