import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StateCard } from './state-card';

afterEach(cleanup);
describe('StateCard', () => {
  it('presents one citizen without requiring a government or photograph', () => {
    render(<StateCard name="Лор" flag="/flag.svg" citizens={1} />);
    expect(screen.getByRole('heading', { name: 'Лор' })).toBeInTheDocument();
    expect(screen.getByText('1 · граждан')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Флаг: Лор' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('keeps a long state name accessible in a linked photograph card', () => {
    const name = 'Содружество свободных городов Северного побережья';
    render(
      <StateCard
        name={name}
        government="Советская республика"
        flag="/flag.svg"
        image="/city.webp"
        href="/states/example"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/states/example');
    expect(screen.getByRole('heading')).toHaveTextContent(name);
    expect(screen.queryByText('Сообщество формируется')).not.toBeInTheDocument();
  });
  it('supports a territory silhouette without a city photograph', () => {
    const { container } = render(
      <StateCard name="Аврора" flag="/flag.svg" silhouette="/territory.svg" />,
    );
    expect(container.querySelector('img[src="/territory.svg"]')).toHaveAttribute('alt', '');
  });
});
