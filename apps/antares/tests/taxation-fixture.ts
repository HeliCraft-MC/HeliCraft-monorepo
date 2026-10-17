import type { Database } from '../src/db';
import { StateReformService } from '../src/modules/states/reforms';
import { StateDraftService } from '../src/modules/states/drafts';
import { DECISION_ACTIONS } from '../src/modules/monetary/domain';
import type { Policy } from '../src/modules/states/contracts';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { TaxOfficeModerationService } from '../src/modules/taxation/moderation';
import type { DirectivePayload } from '../src/modules/monetary/contracts';

// oxlint-disable-next-line max-lines-per-function -- The real reform fixture grants only explicitly selected policies through publication.
async function addEconomicAuthority(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; officeId: string }>,
): Promise<void> {
  const reforms = new StateReformService(db);
  const drafts = new StateDraftService(db);
  const id = await reforms.create(fixture.stateId, fixture.founderId);
  const draft = await drafts.get(id, fixture.founderId);
  const policies: Policy[] = [...new Set(Object.values(DECISION_ACTIONS))]
    .filter(
      (action) =>
        !draft.configuration.governance.policies.some((policy) => policy.action === action),
    )
    .map((action) => ({
      action,
      mechanism: 'SINGLE_OFFICE',
      officeIds: [fixture.officeId],
      vote: null,
      manualProcedure: {},
    }));
  policies.push({
    action: 'AMEND_TREATY',
    mechanism: 'SINGLE_OFFICE',
    officeIds: [fixture.officeId],
    vote: null,
    manualProcedure: {},
  });
  const saved = await drafts.save(id, fixture.founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      governance: {
        ...draft.configuration.governance,
        policies: [
          ...draft.configuration.governance.policies,
          ...policies.filter(
            (policy, index, all) =>
              all.findIndex((other) => other.action === policy.action) === index,
          ),
        ],
      },
    },
  });
  await reforms.propose(id, fixture.founderId, saved.version);
  await reforms.approveOffice(
    { draftId: id, ownerId: fixture.founderId, version: saved.version, officeId: fixture.officeId },
    fixture.founderId,
  );
  await reforms.publish(id, fixture.founderId, saved.version);
}
async function establishTaxOffice(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; adminId: string }>,
): Promise<void> {
  const directives = new MonetaryDirectiveService(db);
  const directiveId = await directives.create(
    fixture.stateId,
    { id: fixture.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'ESTABLISH_TAX_OFFICE',
        name: { en: 'Tax authority', ru: 'Налоговая служба' },
        description: { en: 'Web institution' },
      },
    },
  );
  const moderation = new TaxOfficeModerationService(db);
  const offices = await moderation.list(fixture.adminId);
  const office = offices.find((item) => item.stateId === fixture.stateId);
  if (!office) {
    throw new Error('Missing tax office');
  }
  await moderation.review(office.id, fixture.adminId, {
    directiveId,
    status: 'ACTIVE',
    reason: 'Web institution ratified, no physical building assertion',
  });
}
// oxlint-disable-next-line max-lines-per-function -- The fixture establishes and funds a currency through real approved directives.
async function establishMoney(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; adminId: string }>,
): Promise<string> {
  const actor = { id: fixture.founderId, admin: false };
  const directives = new MonetaryDirectiveService(db);
  const money = new MonetaryService(db);
  async function command(payload: DirectivePayload): Promise<string> {
    return await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload,
    });
  }
  const directiveId = await command({
    kind: 'ESTABLISH_BANK',
    name: { en: 'Bank' },
    description: {},
  });
  const state = await money.state(fixture.stateId, actor);
  if (!state.bank) {
    throw new Error('Bank missing');
  }
  await new BankModerationService(db).review(state.bank.id, fixture.adminId, {
    directiveId,
    status: 'ACTIVE',
    reason: 'Reviewed',
  });
  await command({
    kind: 'CREATE_CURRENCY',
    code: 'TAX',
    name: { en: 'Tax test currency' },
    description: {},
  });
  const { currency } = await money.state(fixture.stateId, actor);
  if (!currency) {
    throw new Error('Currency missing');
  }
  await command({
    kind: 'CHANGE_POLICY',
    currencyId: currency.id,
    policy: {
      maxSupplyMinor: null,
      maxGrossIssuance30dMinor: null,
      maxIssuancePerOperationMinor: null,
    },
  });
  await command({ kind: 'ISSUE', currencyId: currency.id, amountMinor: '1000000', purpose: '' });
  await command({
    kind: 'BANK_TRANSFER',
    currencyId: currency.id,
    amountMinor: '500000',
    purpose: '',
    recipient: { type: 'PLAYER', userId: fixture.founderId },
  });
  return currency.id;
}
export { addEconomicAuthority, establishTaxOffice, establishMoney };
