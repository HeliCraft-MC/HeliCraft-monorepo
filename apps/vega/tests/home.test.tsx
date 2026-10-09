import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { Home } from '../src/home';
import type { ReactElement } from 'react';
import type { HomeData } from '../src/home-data';

const homeData: HomeData = {
  site: {
    phase: 'PRELAUNCH',
    registrationEnabled: false,
    minecraftAddress: null,
    canonicalOrigin: 'https://helicraft.test',
    links: [],
  },
  chronicle: { items: [], total: 0 },
  pages: [],
};

function HonestHome(): ReactElement {
  return <Home data={homeData} />;
}
describe('public home', () => {
  it('keeps a new world useful without fabricated publications or live statistics', async () => {
    const root = createRootRoute({ component: HonestHome });
    const router = createRouter({
      routeTree: root,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    await router.load();
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Оставь след');
    expect(screen.getByRole('link', { name: 'Узнать о запуске' })).toBeInTheDocument();
    expect(screen.getByText('Первая глава ещё пишется.')).toBeInTheDocument();
    expect(screen.queryByText(/онлайн/u)).not.toBeInTheDocument();
  });
});
