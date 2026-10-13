import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlayerPicker } from '../src/player-picker';
import type { SelectedPlayer } from '../src/player-picker';
import { LocaleContext } from '../src/locale-context';

const PRIMARY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const excludedIds = [PRIMARY];
const english = {
  locale: 'en' as const,
  setLocale: (): void => {
    /* Fixed language fixture. */
  },
};
function PickerHarness(): ReactElement {
  const [players, setPlayers] = useState<SelectedPlayer[]>([]);
  return (
    <PlayerPicker
      label="Cofounders"
      players={players}
      onChange={setPlayers}
      excludedIds={excludedIds}
    />
  );
}
function mount(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleContext.Provider value={english}>
      <QueryClientProvider client={client}>
        <PickerHarness />
      </QueryClientProvider>
    </LocaleContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('shared player picker', () => {
  it('debounces prefixes, excludes the founder and prevents duplicate selection', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        items: [
          { id: PRIMARY, name: 'AlexFounder' },
          { id: OTHER, name: 'Alex' },
        ],
      }),
    );
    mount();
    fireEvent.change(screen.getByLabelText('Cofounders'), { target: { value: 'A' } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Cofounders'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByLabelText('Cofounders'), { target: { value: 'Alex' } });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('button', { name: 'AlexFounder' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Alex' }));
    expect(screen.getByRole('button', { name: 'Remove: Alex' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Cofounders'), { target: { value: 'Alex' } });
    await waitFor(() => {
      expect(screen.getByText('No new players match this username.')).toBeVisible();
    });
    expect(
      within(screen.getByRole('list', { name: 'Selected players' })).getAllByRole('listitem'),
    ).toHaveLength(1);
  });
  it('reports failed searches without dropping selected identities', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unavailable'));
    mount();
    fireEvent.change(screen.getByLabelText('Cofounders'), { target: { value: 'Alex' } });
    expect(await screen.findByText('Could not search players. Try again.')).toBeVisible();
  });
});
