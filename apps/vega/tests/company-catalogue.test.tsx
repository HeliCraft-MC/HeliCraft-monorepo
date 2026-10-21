import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CompanyCatalogue } from '@helicraft/alhena';
import { CompanyCataloguePage } from '../src/companies/catalogue';
import { catalogueSearch, catalogueUrl } from '../src/companies/catalogue-search';
import { LocaleProvider } from '../src/locale-provider';

const COMPANY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const catalogue: CompanyCatalogue = {
  items: [
    {
      id: COMPANY_ID,
      name: { en: 'Published & renamed company' },
      description: { ru: 'Публичное описание' },
      registrationStateId: STATE_ID,
      registrationStateName: { en: 'Public jurisdiction' },
      status: 'SUSPENDED',
      foundedAt: '2026-10-18T23:00:00.000Z',
    },
  ],
  jurisdictions: [{ id: STATE_ID, name: { en: 'Public jurisdiction' } }],
  page: 2,
  pageSize: 12,
  total: 25,
};
const emptyCatalogue: CompanyCatalogue = { ...catalogue, items: [], total: 0, page: 1 };
describe('published company catalogue', () => {
  it('renders localized public identity, real status, legal jurisdiction and UTC date without JavaScript', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider locale="ru">
        <CompanyCataloguePage
          catalogue={catalogue}
          search={catalogueSearch.parse({ status: 'ALL', page: '2' })}
        />
      </LocaleProvider>,
    );
    expect(html).toContain('Published &amp; renamed company');
    expect(html).toContain('Публичное описание');
    expect(html).toContain('Public jurisdiction');
    expect(html).toContain('Приостановлено');
    expect(html).toContain('18 октября 2026');
    expect(html).toContain('method="get"');
    expect(html).toContain('Страница 2 / 3');
    expect(html).not.toContain('balanceMinor');
    expect(html).toContain(`href="/companies/${COMPANY_ID}"`);
    expect(html).not.toContain(`>${COMPANY_ID}<`);
  });
  it('keeps outage and empty-result messages distinct', () => {
    const search = catalogueSearch.parse({});
    const outage = renderToStaticMarkup(
      <LocaleProvider locale="en">
        <CompanyCataloguePage catalogue={null} search={search} />
      </LocaleProvider>,
    );
    const empty = renderToStaticMarkup(
      <LocaleProvider locale="en">
        <CompanyCataloguePage catalogue={emptyCatalogue} search={search} />
      </LocaleProvider>,
    );
    expect(outage).toContain('temporarily unavailable');
    expect(outage).not.toContain('Companies found:');
    expect(empty).toContain('No companies found');
    expect(empty).toContain('Companies found:');
  });
  it('normalizes malformed URLs without allowing unpublished lifecycle filters', () => {
    expect(
      catalogueSearch.parse({ page: 'NaN', status: 'DRAFT', stateId: 'invented', sort: 'balance' }),
    ).toStrictEqual({
      search: '',
      stateId: '',
      status: 'ACTIVE',
      sort: 'NEWEST',
      page: 1,
    });
  });
  it('preserves exact jurisdiction, literal search, status, sorting and language in server pagination', () => {
    const search = catalogueSearch.parse({
      search: '  Name_% & мир  ',
      stateId: STATE_ID,
      status: 'ALL',
      sort: 'NAME',
      page: '2',
    });
    const url = new URL(catalogueUrl(search, 'en', 3), 'https://catalogue.test');
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      search: 'Name_% & мир',
      stateId: STATE_ID,
      status: 'ALL',
      sort: 'NAME',
      page: '3',
      lang: 'en',
    });
  });
});
