import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from '../src/home';
import { LocaleProvider } from '../src/locale-provider';
import { isLocale, translate } from '../src/locales';
import { ru } from '../src/locales/ru';
import { en } from '../src/locales/en';
import type { HomeData } from '../src/home-data';

const data: HomeData = {
  site: {
    serverName: 'HeliCraft',
    githubUrl: 'https://github.com/HeliCraft-MC',
    logoUrl: null,
    phase: 'PRELAUNCH',
    registrationEnabled: true,
    minecraftAddress: null,
    canonicalOrigin: 'https://helicraft.test',
    links: [],
  },
  gallery: null,
  states: { items: [], total: 0, page: 1, pageSize: 3 },
};
describe('languages', () => {
  it('keeps complete dictionaries and rejects unsupported or inherited language names', () => {
    expect(Object.keys(en).toSorted()).toStrictEqual(Object.keys(ru).toSorted());
    expect(Object.keys(ru).every((key) => /^[a-z][a-zA-Z]*(?:\.[a-z][a-zA-Z]*)+$/u.test(key))).toBe(
      true,
    );
    expect(isLocale('en')).toBe(true);
    expect(isLocale('constructor')).toBe(false);
    expect(isLocale('de')).toBe(false);
    expect(translate('Player-authored title', 'en')).toBe('Player-authored title');
  });
  it('renders English home text and accessible carousel labels without translating published captions', () => {
    render(
      <LocaleProvider locale="en">
        <Home data={data} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Minecraft for');
    expect(screen.getByRole('heading', { name: 'Northway' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next photograph' })).toBeInTheDocument();
    expect(
      screen.getByText('No approved states yet. Become the founder of the first one.'),
    ).toBeInTheDocument();
  });
});
