import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VotingInput } from '@helicraft/alhena';
import { LocaleProvider } from '../src/locale-provider';
import { VotingBallot } from '../src/states/voting-ballot';

const input: VotingInput = {
  title: { en: 'Survey' },
  description: {},
  opensAt: '2026-10-14T00:00:00Z',
  closesAt: '2026-10-15T00:00:00Z',
  options: [
    { id: 'yes', label: { en: 'Yes' } },
    { id: 'no', label: { en: 'No' } },
    { id: 'north', label: { en: 'North' } },
    { id: 'south', label: { en: 'South' } },
  ],
  questions: [
    { id: 'build', title: { en: 'Build?' }, optionIds: ['yes', 'no'], maxSelections: 1 },
    { id: 'where', title: { en: 'Where?' }, optionIds: ['north', 'south'], maxSelections: 1 },
  ],
  maxSelections: 1,
  electorate: { type: 'GLOBAL_USERS' },
  resultVisibility: 'PUBLIC',
  rules: {
    allowAbstain: true,
    durationHours: 24,
    quorumPercent: 0,
    thresholdPercent: 50,
    thresholdKind: 'PERCENT',
  },
};
function Ballot(): ReactElement {
  const [choices, setChoices] = useState<string[]>([]);
  return <VotingBallot input={input} choices={choices} onChange={setChoices} disabled={false} />;
}
afterEach(cleanup);
describe('multi-question ballot', () => {
  it('changes a single answer without clearing another question', () => {
    render(
      <LocaleProvider locale="en">
        <Ballot />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'North' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^No$/u }));
    expect(screen.getByRole('checkbox', { name: 'Yes' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^No$/u })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'North' })).toBeChecked();
  });
});
