import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { VotingInput } from '@helicraft/alhena';
import { LocaleProvider } from '../src/locale-provider';
import { SurveyForm } from '../src/surveys/form';
import { SurveyEditor } from '../src/surveys/editor';
import { newBlock, changeType } from '../src/surveys/model';

function fixture(): VotingInput {
  const text = { ...newBlock(), title: { en: 'Project' }, required: true };
  return {
    title: { en: 'Community' },
    description: {},
    survey: { blocks: [text], oneResponsePerUser: true },
    options: [],
    opensAt: '2026-10-17T00:00:00Z',
    closesAt: '2026-10-18T00:00:00Z',
    electorate: { type: 'GLOBAL_USERS' },
    maxSelections: 1,
    resultVisibility: 'PUBLIC',
    rules: {
      durationHours: 24,
      quorumPercent: 0,
      thresholdPercent: 50,
      thresholdKind: 'PERCENT',
      allowAbstain: false,
    },
  };
}
function Editor(): ReactElement {
  const [input, setInput] = useState(() => {
    const start = fixture();
    const block = start.survey?.blocks[0];
    return block === undefined ? start : changeType(start, block, 'CHECKBOX');
  });
  return <SurveyEditor input={input} onChange={setInput} />;
}
afterEach(cleanup);
describe('survey UX', () => {
  it('submits text and permits omitted optional answers', () => {
    const submit = vi.fn<(answers: unknown) => void>();
    render(
      <LocaleProvider locale="en">
        <SurveyForm input={fixture()} onSubmit={submit} />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Project *'), { target: { value: 'A port' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit responses' }));
    expect(submit).toHaveBeenCalledWith([expect.objectContaining({ value: 'A port' })]);
  });
  it('duplicates choice questions without sharing answer identifiers or edits', () => {
    render(
      <LocaleProvider locale="en">
        <Editor />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Option 1 · English'), { target: { value: 'North' } });
    fireEvent.change(screen.getByLabelText('Option 2 · English'), { target: { value: 'South' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    const firstOptions = screen.getAllByLabelText('Option 1 · English');
    expect(firstOptions).toHaveLength(2);
    const [first, second] = firstOptions;
    if (!first || !second) {
      throw new Error('Missing options');
    }
    fireEvent.change(second, { target: { value: 'East' } });
    expect(first).toHaveValue('North');
    expect(second).toHaveValue('East');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove block' })[0] ?? first);
    expect(screen.getByLabelText('Option 1 · English')).toHaveValue('East');
  });
});
