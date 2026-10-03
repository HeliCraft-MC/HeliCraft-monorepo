import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from '../src/home';
import type { loadGreeting } from '../src/api';

vi.mock(import('../src/api'), () => ({
  loadGreeting: vi.fn<typeof loadGreeting>().mockResolvedValue({ message: 'Hello, HeliCraft!' }),
}));

describe('vega home', () => {
  it('shows the world greeting from Antares', async () => {
    expect.assertions(2);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Home />
      </QueryClientProvider>,
    );
    const greeting = await screen.findByText('Hello, HeliCraft!');
    expect(greeting).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh world' })).toBeEnabled();
  }, 5000);
});
