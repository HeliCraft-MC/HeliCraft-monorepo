import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';
import { createFxFixture, fxCommand } from './fx-fixture';
import { freeCompanyPolicy } from './companies-fixture';
import { createStorage } from '../src/storage';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { CompanyInboxPageSchema } from '../src/modules/companies/inbox-contracts';
import type { CompanyInboxKind, CompanyInboxPage } from '../src/modules/companies/inbox-contracts';

const ORIGIN = 'https://company-ux.test';
const STORAGE_PORT = 8333;
const HTTP_OK = 200;
interface CompanyUxFixture {
  fixture: Awaited<ReturnType<typeof createFxFixture>>;
  media: StartedTestContainer;
  storage: ReturnType<typeof createStorage>;
  app: ReturnType<typeof createApp>;
  ownerId: string;
  ownerToken: string;
  outsiderToken: string;
  citizenToken: string;
  stateToken: string;
}
const PASSWORD = 'A sufficiently long password';
async function createCompanyUxFixture(): Promise<CompanyUxFixture> {
  const fixture = await createFxFixture();
  const media = await new GenericContainer('chrislusf/seaweedfs:4.48')
    .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
    .withEnvironment({
      AWS_ACCESS_KEY_ID: 'ux-test',
      AWS_SECRET_ACCESS_KEY: 'ux-secret',
      S3_BUCKET: 'helicraft',
    })
    .withExposedPorts(STORAGE_PORT)
    .withWaitStrategy(Wait.forLogMessage('All enabled components are running and ready to use:'))
    .start();
  const storage = createStorage({
    S3_ENDPOINT: `http://${media.getHost()}:${media.getMappedPort(STORAGE_PORT)}`,
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'ux-test',
    S3_SECRET_KEY: 'ux-secret',
  });
  const app = createApp({
    db: fixture.db.db,
    siteOrigin: ORIGIN,
    storage,
    bucket: 'helicraft',
    checkReady: async (): Promise<void> => {
      await fixture.db.pool.query('select 1');
    },
  });
  const identity = new IdentityService(fixture.db.db);
  const ownerToken = await identity.register('UxApplicant', PASSWORD);
  const outsiderToken = await identity.register('UxOutsider', PASSWORD);
  const owner = await new SessionService(fixture.db.db).authenticate(ownerToken);
  const citizenToken = await identity.login('MoneyCitizenFxA', PASSWORD);
  const stateToken = await identity.login('MoneyFounderFxA', PASSWORD);
  await fxCommand(fixture, fixture.first, {
    kind: 'SET_COMPANY_REGISTRATION_POLICY',
    baseRevisionId: null,
    policy: freeCompanyPolicy,
  });
  return {
    fixture,
    media,
    storage,
    app,
    ownerId: owner.principal.id,
    ownerToken,
    outsiderToken,
    citizenToken,
    stateToken,
  };
}
function auth(token: string): { Origin: string; Cookie: string } {
  return { Origin: ORIGIN, Cookie: `helicraft_session=${token}` };
}
async function inbox(
  context: CompanyUxFixture,
  token: string,
  kind: CompanyInboxKind,
): Promise<CompanyInboxPage> {
  const response = await context.app.request(`/api/v1/account/company-inbox?kind=${kind}`, {
    headers: auth(token),
  });
  if (response.status !== HTTP_OK) {
    throw new Error(`Inbox failed: ${response.status} ${await response.text()}`);
  }
  return CompanyInboxPageSchema.parse(await response.json());
}
export { createCompanyUxFixture, auth, inbox, type CompanyUxFixture };
