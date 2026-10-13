import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PublicStateSummary } from '@helicraft/alhena';
import { LocaleProvider } from '../src/locale-provider';
import { PublicStateCard } from '../src/states/public-card';
import { directorySearch, directoryUrl } from '../src/states/directory-search';

const state: PublicStateSummary = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'stable-slug',
  name: { en: 'A renamed state' },
  description: { ru: 'Описание сообщества' },
  color: '#ffffff',
  horizontalFlag: { mode: 'BANNER', design: { baseColor: 'blue', layers: [] } },
  citizenship: { entryMode: 'OPEN', allowMultipleCitizenships: true },
  citizens: 7,
  officeCount: 2,
  hasConstitution: false,
  createdAt: '2026-10-13T00:00:00Z',
};
const png: PublicStateSummary = {
  ...state,
  horizontalFlag: { mode: 'PNG', mediaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
};

afterEach(cleanup);
describe('public state directory', () => {
  it('uses localized fallback, published facts and the stable slug for renamed states', () => {
    render(
      <LocaleProvider locale="ru">
        <PublicStateCard state={state} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/states/stable-slug');
    expect(screen.getByRole('heading')).toHaveTextContent('A renamed state');
    expect(screen.getByText('Описание сообщества')).toBeInTheDocument();
    expect(screen.getByText('7 · граждан')).toBeInTheDocument();
    expect(screen.getByText('Свободное вступление')).toBeInTheDocument();
    expect(screen.getByText('Без формального документа')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Флаг: A renamed state' }).tagName).toBe('svg');
  });
  it('renders an uploaded flag through its public endpoint', () => {
    render(
      <LocaleProvider locale="en">
        <PublicStateCard state={png} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('img', { name: 'Flag: A renamed state' })).toHaveAttribute(
      'src',
      '/api/v1/public/states/stable-slug/flag',
    );
    expect(screen.getByText('Open entry')).toBeInTheDocument();
  });
  it('normalizes malformed URL controls and preserves filters and language in page links', () => {
    expect(
      directorySearch.parse({ page: 'NaN', sort: 'invalid', constitution: 'DRAFT' }),
    ).toStrictEqual({ search: '', entryMode: 'ALL', constitution: 'ALL', sort: 'NEWEST', page: 1 });
    const query = directorySearch.parse({
      search: '  Аврора & море  ',
      entryMode: 'OPEN',
      constitution: 'NO',
      sort: 'NAME',
      page: '2',
    });
    const url = new URL(directoryUrl(query, 'en', 3), 'https://helicraft.test');
    expect(url.searchParams.get('search')).toBe('Аврора & море');
    expect(url.searchParams.get('entryMode')).toBe('OPEN');
    expect(url.searchParams.get('constitution')).toBe('NO');
    expect(url.searchParams.get('sort')).toBe('NAME');
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('lang')).toBe('en');
  });
});
