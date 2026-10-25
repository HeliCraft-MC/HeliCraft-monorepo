import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VotingInput } from '@helicraft/alhena';
import { LocaleProvider } from '../src/locale-provider';
import { PollCreator } from '../src/states/poll-creator';
import { initialPoll } from '../src/states/poll-form-model';
import { pollReadiness } from '../src/states/poll-readiness';

const complete: VotingInput = {
  ...initialPoll(),
  title: { en: 'Transport' },
  questions: [
    { id: 'route', title: { en: 'Where?' }, optionIds: ['north', 'south'], maxSelections: 1 },
  ],
  options: [
    { id: 'north', label: { en: 'North' } },
    { id: 'south', label: { en: 'South' } },
  ],
};
const draft = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', input: complete };
afterEach(cleanup);
describe('poll publication workflow', () => {
  it('reaches interactive review without publishing when Continue becomes Publish', () => {
    const saved = vi.fn<() => void>();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <LocaleProvider locale="en">
          <PollCreator draft={draft} onCreated={saved} />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Publish poll' })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: 'North' }));
    expect(screen.getByRole('radio', { name: 'North' })).toBeChecked();
    expect(saved).not.toHaveBeenCalled();
    client.clear();
  });
  it('shows actionable problems for incomplete questions and inverted dates', () => {
    const input = {
      ...complete,
      title: {},
      options: [{ id: 'north', label: {} }],
      closesAt: complete.opensAt,
    };
    expect(pollReadiness(input, 'en')).toEqual([
      'Add a poll title.',
      'Fill in every answer option.',
      'In Settings, choose a closing time after the opening time.',
    ]);
    expect(pollReadiness(complete, 'en')).toEqual([]);
  });
});
