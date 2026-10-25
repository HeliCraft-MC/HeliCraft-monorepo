import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalizableTextInput } from './localizable-text-input';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
];
function Harness(): ReactElement {
  const [value, setValue] = useState<Partial<Record<string, string>>>({ en: 'Aurora' });
  return (
    <LocalizableTextInput
      label="Name"
      value={value}
      onChange={setValue}
      languages={languages}
      defaultLanguage="en"
      languageLabel="Language"
      progressLabel="Completed"
    />
  );
}
afterEach(cleanup);
describe('multilingual text editing', () => {
  it('preserves independent edits while switching and does not create fallback translations', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Name · English'), {
      target: { value: 'Aurora Republic' },
    });
    fireEvent.click(screen.getByText('Language'));
    expect(screen.getByLabelText('Name · Русский')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Name · Русский'), { target: { value: 'Аврора' } });
    fireEvent.click(screen.getByText('Language'));
    expect(screen.getByLabelText('Name · English')).toHaveValue('Aurora Republic');
    expect(screen.getByLabelText('Completed: 2/3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Language'));
    expect(screen.getByLabelText('Name · Deutsch')).toHaveValue('');
  });
});
