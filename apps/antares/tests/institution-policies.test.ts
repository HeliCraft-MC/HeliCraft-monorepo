import { describe, expect, it } from 'vitest';
import type { Policy } from '../src/modules/states/contracts';
import { mergeInstitutionPolicies } from '../src/modules/states/institution-policies';
import { decisionPolicy } from '../src/modules/monetary/domain';

const office = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const shared: Policy = {
  action: 'CREATE_INSTITUTION',
  mechanism: 'SINGLE_OFFICE',
  officeIds: [office],
  vote: null,
  manualProcedure: {},
};
const legacy: Policy = {
  ...shared,
  action: 'ESTABLISH_CENTRAL_BANK',
  mechanism: 'CITIZEN_VOTE',
  officeIds: [],
};
describe('institution governance boundaries', () => {
  it('prefers general establishment authority while retaining old published procedures', () => {
    expect(decisionPolicy([legacy], 'ESTABLISH_BANK')).toBe(legacy);
    expect(decisionPolicy([legacy], 'ESTABLISH_TAX_OFFICE')).toBeUndefined();
    expect(decisionPolicy([legacy, shared], 'ESTABLISH_BANK')).toBe(shared);
    expect(decisionPolicy([shared], 'ESTABLISH_TAX_OFFICE')).toBe(shared);
  });
  it('allows only new procedures for the selected institution and preserves configured rules', () => {
    const currency: Policy = { ...shared, action: 'CREATE_CURRENCY' };
    expect(mergeInstitutionPolicies([shared], [currency], 'ESTABLISH_BANK')).toEqual([
      shared,
      currency,
    ]);
    expect(mergeInstitutionPolicies([shared, currency], [currency], 'ESTABLISH_BANK')).toEqual([
      shared,
      currency,
    ]);
    expect(() => mergeInstitutionPolicies([shared], [currency], 'ESTABLISH_TAX_OFFICE')).toThrow(
      'только процедуры',
    );
    expect(() =>
      mergeInstitutionPolicies([shared], [currency, currency], 'ESTABLISH_BANK'),
    ).toThrow('повторений');
    expect(() =>
      mergeInstitutionPolicies(
        [shared, currency],
        [{ ...currency, mechanism: 'CITIZEN_VOTE', officeIds: [] }],
        'ESTABLISH_BANK',
      ),
    ).toThrow('реформу');
  });
});
