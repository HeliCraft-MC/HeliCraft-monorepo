import { describe, expect, it } from 'vitest';
import {
  assertBranchPolicy,
  assertBranchResubmission,
} from '../src/modules/companies/branch-domain';
import type { BranchPolicyContext } from '../src/modules/companies/branch-domain';
import type { BranchRegistration } from '../src/modules/companies/branch-contracts';
import { freeCompanyPolicy } from './companies-fixture';
import { extractDecisionTexts, mapDecisionTexts } from '../src/modules/companies/decision-texts';

function request(): BranchRegistration {
  return {
    kind: 'REGISTER_BRANCH',
    branchId: crypto.randomUUID(),
    stateId: crypto.randomUUID(),
    policyRevisionId: crypto.randomUUID(),
    name: { ru: 'Иностранное подразделение' },
    description: { en: 'Presence belongs to its existing legal company' },
  };
}
function context(payload: BranchRegistration): BranchPolicyContext {
  return {
    companyStatus: 'ACTIVE',
    registrationStateId: crypto.randomUUID(),
    hostActive: true,
    latestPolicyId: payload.policyRevisionId,
    policy: freeCompanyPolicy,
  };
}
describe('branch registration domain', () => {
  it('accepts domestic or foreign presence under the exact published host rules with a localized name', () => {
    const payload = request();
    expect(() => {
      assertBranchPolicy(context(payload), payload);
    }).not.toThrow();
    expect(() => {
      assertBranchPolicy({ ...context(payload), registrationStateId: payload.stateId }, payload);
    }).not.toThrow();
  });
  it('denies inactive participants and obsolete policy pins', () => {
    const payload = request();
    const current = context(payload);
    expect(() => {
      assertBranchPolicy({ ...current, companyStatus: 'SUSPENDED' }, payload);
    }).toThrow('активны');
    expect(() => {
      assertBranchPolicy({ ...current, hostActive: false }, payload);
    }).toThrow('активны');
    expect(() => {
      assertBranchPolicy({ ...current, latestPolicyId: crypto.randomUUID() }, payload);
    }).toThrow('изменились');
  });
  it('applies foreign restrictions to registration jurisdiction rather than an initiator citizenship', () => {
    const payload = request();
    const current = context(payload);
    const restricted = {
      ...current,
      policy: { ...freeCompanyPolicy, foreignBranches: 'DENY' as const },
    };
    expect(() => {
      assertBranchPolicy(restricted, payload);
    }).toThrow('не разрешают');
    expect(() => {
      assertBranchPolicy({ ...restricted, registrationStateId: payload.stateId }, payload);
    }).not.toThrow();
    expect(() => {
      assertBranchPolicy(
        { ...current, policy: { ...freeCompanyPolicy, branchMode: 'DENY' } },
        payload,
      );
    }).toThrow('не разрешают');
  });
  it('requires meaningful normalized name content', () => {
    const payload = request();
    expect(() => {
      assertBranchPolicy(context(payload), { ...payload, name: {} });
    }).toThrow('название');
    expect(() => {
      assertBranchPolicy(context(payload), { ...payload, name: { en: '   ' } });
    }).toThrow('название');
  });
  it('preserves a pending/rejected identity while preventing active re-registration and closed identity reuse', () => {
    expect(() => {
      assertBranchResubmission('PENDING_REGISTRATION');
    }).not.toThrow();
    expect(() => {
      assertBranchResubmission('REJECTED');
    }).not.toThrow();
    expect(() => {
      assertBranchResubmission('ACTIVE');
    }).toThrow('уже действует');
    expect(() => {
      assertBranchResubmission('CLOSED');
    }).toThrow('закрыт');
  });
  it('stores names through the shared immutable decision text references without changing legal terms', () => {
    const payload = request();
    const extracted = extractDecisionTexts(payload);
    expect(extracted.machine).toEqual({ ...payload, name: {}, description: {} });
    expect(mapDecisionTexts(extracted.machine, (path) => extracted.texts.get(path) ?? {})).toEqual(
      payload,
    );
  });
});
