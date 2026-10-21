import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TaxLawRevision } from '@helicraft/alhena';
import { TaxLawFields } from '../src/taxation/law-fields';
import { taxRuleFromForm } from '../src/taxation/compose';
import { LocaleContext } from '../src/locale-context';

const english = {
  locale: 'en' as const,
  setLocale: (): void => {
    /* Fixed test language. */
  },
};
function formData(): FormData {
  const form = screen.getByRole('form', { name: 'Tax law' });
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('Expected tax form');
  }
  return new FormData(form);
}
function revisionFixture(): TaxLawRevision {
  const id = crypto.randomUUID();
  return {
    id,
    lawId: id,
    stateId: id,
    directiveId: id,
    number: 2,
    status: 'ACTIVE',
    name: {},
    description: {},
    document: {},
    effectiveAt: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
    rule: {
      event: 'PLAYER_TRANSFER',
      category: 'TRANSFER',
      taxpayer: 'RECIPIENT',
      recipient: 'CENTRAL_BANK',
      rateBps: 500,
      jurisdictions: ['CITIZENSHIP', 'TERRITORIAL'],
      currencyIds: [],
      base: { kind: 'EXCESS', thresholdMinor: '900719925474099312' },
    },
  };
}
function TaxLawForm({ revision }: Readonly<{ revision?: TaxLawRevision }>): ReactElement {
  return (
    <LocaleContext.Provider value={english}>
      <form aria-label="Tax law">
        <TaxLawFields revision={revision} />
      </form>
    </LocaleContext.Provider>
  );
}
function mount(revision?: TaxLawRevision): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TaxLawForm revision={revision} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({
      items: [
        { code: 'TRANSFER', name: { en: 'General money transfers' }, description: {} },
        { code: 'INCOME', name: { en: 'Transfer receipts' }, description: {} },
        { code: 'CONTRIBUTION', name: { en: 'Transfer contributions' }, description: {} },
      ],
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('executable tax settings form', () => {
  it('submits selected taxpayer, allowance, category and official recipient', async () => {
    mount();
    await screen.findByRole('option', { name: 'Transfer receipts · INCOME' });
    fireEvent.change(screen.getByLabelText('Taxpayer', { exact: true }), {
      target: { value: 'RECIPIENT' },
    });
    fireEvent.change(screen.getByLabelText('Tax base', { exact: true }), {
      target: { value: 'EXCESS' },
    });
    fireEvent.change(screen.getByLabelText('Tax-free allowance', { exact: true }), {
      target: { value: '100.00' },
    });
    fireEvent.change(screen.getByLabelText('Tax category', { exact: true }), {
      target: { value: 'INCOME' },
    });
    fireEvent.change(screen.getByLabelText('Tax recipient', { exact: true }), {
      target: { value: 'CENTRAL_BANK' },
    });
    expect(taxRuleFromForm(formData())).toMatchObject({
      taxpayer: 'RECIPIENT',
      base: { kind: 'EXCESS', thresholdMinor: '10000' },
      category: 'INCOME',
      recipient: 'CENTRAL_BANK',
    });
    fireEvent.change(screen.getByLabelText('Tax base', { exact: true }), {
      target: { value: 'FULL_AMOUNT' },
    });
    expect(taxRuleFromForm(formData()).base).toEqual({ kind: 'FULL_AMOUNT' });
    expect(screen.queryByLabelText('Tax-free allowance', { exact: true })).not.toBeInTheDocument();
  });
  it('supports several actual corporate events and fails when no event is selected', async () => {
    mount();
    await screen.findByRole('option', { name: 'Transfer receipts · INCOME' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Player → player' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Company → player' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Company → company' }));
    fireEvent.change(screen.getByLabelText('Tax jurisdiction', { exact: true }), {
      target: { value: 'COMPANY_REGISTRATION' },
    });
    expect(taxRuleFromForm(formData())).toMatchObject({
      event: 'COMPANY_PLAYER_TRANSFER',
      events: ['COMPANY_PLAYER_TRANSFER', 'COMPANY_TRANSFER'],
      jurisdictions: ['COMPANY_REGISTRATION'],
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Company → player' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Company → company' }));
    expect(() => taxRuleFromForm(formData())).toThrow('Select supported tax events');
  });
  it('restores both jurisdictions and an allowance beyond Number precision without grouping separators', async () => {
    const revision = revisionFixture();
    mount(revision);
    await screen.findByRole('option', { name: 'Transfer receipts · INCOME' });
    expect(screen.getByLabelText('Tax-free allowance', { exact: true })).toHaveValue(
      '9007199254740993.12',
    );
    expect(taxRuleFromForm(formData())).toEqual(revision.rule);
    fireEvent.change(screen.getByLabelText('Tax-free allowance', { exact: true }), {
      target: { value: '0' },
    });
    expect(taxRuleFromForm(formData()).base).toEqual({ kind: 'EXCESS', thresholdMinor: '0' });
  });
});
