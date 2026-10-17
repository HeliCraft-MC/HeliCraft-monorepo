import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FormField } from '../FormField/form-field';
import { TextField } from '../TextField/text-field';

afterEach(cleanup);
describe('field explanations', () => {
  it('keeps input labels distinct and opens help by clicking the information control', async () => {
    render(
      <FormField
        htmlFor="quorum"
        label="Quorum"
        help="At least 40 out of 100 voters must participate."
      >
        <TextField id="quorum" />
      </FormField>,
    );
    expect(screen.getByLabelText('Quorum').tagName).toBe('INPUT');
    fireEvent.click(screen.getByRole('button', { name: 'ⓘ Quorum' }));
    expect(
      await screen.findByText('At least 40 out of 100 voters must participate.'),
    ).toBeVisible();
  });
});
