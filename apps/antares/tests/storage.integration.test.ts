import { GetObjectCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { GenericContainer, Wait } from 'testcontainers';
import { describe, expect, it } from 'vitest';
import { createStorage } from '../src/storage';

describe('s3 storage', () => {
  it('writes and reads an object through the production S3 adapter', async () => {
    expect.assertions(1);
    const container = await new GenericContainer('chrislusf/seaweedfs:4.48')
      .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: 'test-access',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        S3_BUCKET: 'helicraft',
      })
      .withExposedPorts(8333, 9333)
      .withWaitStrategy(
        Wait.forAll([Wait.forListeningPorts(), Wait.forHttp('/cluster/status', 9333)]),
      )
      .start();
    const storage = createStorage({
      PORT: 3000,
      DATABASE_URL: 'postgresql://unused',
      S3_ENDPOINT: `http://${container.getHost()}:${container.getMappedPort(8333)}`,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'test-access',
      S3_SECRET_KEY: 'test-secret',
      S3_BUCKET: 'helicraft',
    });
    try {
      await storage.send(new HeadBucketCommand({ Bucket: 'helicraft' }));
      await storage.send(
        new PutObjectCommand({ Bucket: 'helicraft', Key: 'hello.txt', Body: 'Hello, HeliCraft!' }),
      );
      const result = await storage.send(
        new GetObjectCommand({ Bucket: 'helicraft', Key: 'hello.txt' }),
      );
      const body = await result.Body?.transformToString();
      expect(body).toBe('Hello, HeliCraft!');
    } finally {
      storage.destroy();
      await container.stop();
    }
  }, 120_000);
});
