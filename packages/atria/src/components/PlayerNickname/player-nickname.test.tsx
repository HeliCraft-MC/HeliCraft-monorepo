import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerNickname } from './player-nickname';

afterEach(cleanup);
describe('PlayerNickname', () => {
  it('links to the profile with only the nickname as accessible name', () => {
    render(<PlayerNickname name="Builder" headUrl="/avatar.png" href="/players/builder-id" />);
    expect(screen.getByRole('link', { name: 'Builder' })).toHaveAttribute(
      'href',
      '/players/builder-id',
    );
  });
  it('keeps the nickname readable and decorative head out of the accessible name', () => {
    const { container } = render(<PlayerNickname name="Builder" headUrl="/avatar.png" />);
    expect(screen.getByText('Builder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const image = container.querySelector('img');
    if (!image) {
      throw new Error('Head missing');
    }
    expect(image).toHaveAttribute('src', '/avatar.png');
    fireEvent.error(image);
    expect(screen.getByText('Builder')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
