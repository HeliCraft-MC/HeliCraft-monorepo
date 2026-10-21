import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listStates } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

const PAGE_SIZE = 100;
function CompanyStateIdentity({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['published-state-identity', id, locale],
    queryFn: async () => {
      let page = 1;
      let total = PAGE_SIZE;
      do {
        // oxlint-disable-next-line no-await-in-loop -- Directory pages are inspected until the selected real state identity is found.
        const result = await listStates({
          client: createClient({ credentials: 'omit' }),
          query: { page, pageSize: PAGE_SIZE, locale },
          throwOnError: true,
        });
        const found = result.data.items.find((item) => item.id === id);
        if (found !== undefined) {
          return found;
        }
        ({ total } = result.data);
        page += 1;
      } while ((page - 1) * PAGE_SIZE < total);
      return null;
    },
  });
  return query.data === null || query.data === undefined ? (
    <span>
      {query.isPending
        ? uiText(locale, 'Загрузка государства…', 'Loading jurisdiction…')
        : uiText(locale, 'Государство недоступно', 'Jurisdiction unavailable')}
    </span>
  ) : (
    <a href={`/states/${query.data.slug}`}>{displayText(query.data.name, locale)}</a>
  );
}
export { CompanyStateIdentity };
