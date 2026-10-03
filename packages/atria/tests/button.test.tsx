import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src';

describe('atria button', () => {
  it('supports keyboard activation and native disabled semantics', async () => {
    expect.assertions(3);
    const click = vi.fn<() => void>();
    const user = userEvent.setup();
    const { rerender } = render(<Button onClick={click}>Continue</Button>);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalledTimes(1);
    rerender(
      <Button disabled onClick={click}>
        Continue
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(click).toHaveBeenCalledTimes(1);
  }, 5000);
});
