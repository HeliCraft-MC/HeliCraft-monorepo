import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StateName } from './state-name';

afterEach(cleanup);
describe('state previews', () => {
  it('enables a preview by default and still requests lazy details', async () => {
    const request = vi.fn<() => void>();
    render(<StateName name="Аврора" href="/states/aurora" color="#222222" onPreview={request} />);
    fireEvent.focus(screen.getByRole('link', { name: 'Аврора' }));
    expect(request).toHaveBeenCalledOnce();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Аврора');
  });
  it('preserves the focused link when lazy preview details arrive', () => {
    const { rerender } = render(<StateName name="Аврора" href="/states/aurora" color="#222222" />);
    const link = screen.getByRole('link', { name: 'Аврора' });
    link.focus();
    rerender(
      <StateName
        name="Аврора"
        href="/states/aurora"
        color="#222222"
        description="Государство у моря"
      />,
    );
    expect(screen.getByRole('link', { name: 'Аврора' })).toBe(link);
    expect(link).toHaveFocus();
  });
});
