import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { CompanyPicker } from '../src/company-picker';
import { LocaleContext } from '../src/locale-context';

const english = {
  locale: 'en' as const,
  setLocale: (): void => {
    /* Fixed language fixture. */
  },
};
const COMPANY: PublishedCompanyIdentity = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: { en: 'Aster Works', ru: 'Звёздная мастерская' },
  description: {},
  registrationStateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  registrationStateName: { en: 'Published jurisdiction' },
  status: 'ACTIVE',
  foundedAt: new Date(0).toISOString(),
};
function Harness(): ReactElement {
  const [value, setValue] = useState<PublishedCompanyIdentity | null>(null);
  return <CompanyPicker value={value} onChange={setValue} />;
}
function mount(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleContext.Provider value={english}>
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    </LocaleContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('company recipient picker', () => {
  it('searches published identities without cookies and requires clearing the chosen legal recipient before changing it', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ items: [COMPANY], nextId: null }));
    mount();
    const input = screen.getByLabelText('Recipient company');
    fireEvent.change(input, { target: { value: 'A' } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'As' } });
    fireEvent.change(input, { target: { value: 'Aster' } });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    const [request] = fetch.mock.calls[0] ?? [];
    if (!(request instanceof Request)) {
      throw new Error('Expected a generated client Request');
    }
    expect(request.credentials).toBe('omit');
    expect(request.url).toContain('/public/companies?query=Aster');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Aster Works · Published jurisdiction' }),
    );
    expect(input).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove: Aster Works' }));
    expect(input).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Aster Works · Published jurisdiction' }),
    ).not.toBeInTheDocument();
  });
  it('reports unavailable search results without accepting an invented company ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unavailable'));
    mount();
    fireEvent.change(screen.getByLabelText('Recipient company'), { target: { value: 'Aster' } });
    expect(await screen.findByText('Company search unavailable. Try again.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Remove:/u })).not.toBeInTheDocument();
  });
});
