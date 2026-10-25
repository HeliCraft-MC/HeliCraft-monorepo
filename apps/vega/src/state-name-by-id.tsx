import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listStates } from '@helicraft/alhena';
import { useTranslation } from './i18n';
import { StateName as Name } from '@helicraft/atria';
import { StatePreviewName } from './state-preview-name';
import { displayText, uiText } from './states/text';

const PAGE_SIZE = 20;
function StateNameById({
  id,
  name,
  color,
  facts,
}: Readonly<{ id: string; name?: string; color: string; facts?: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['published-state-identity', id, locale],
    staleTime: 60_000,
    retry: false,
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
  if (query.data === null || query.data === undefined) {
    const fallback =
      name ??
      (query.isPending
        ? uiText(locale, 'Загрузка государства…', 'Loading state…')
        : uiText(locale, 'Государство недоступно', 'State unavailable'));
    return <Name name={fallback} color={color} href="" linked={false} />;
  }
  return (
    <StatePreviewName
      name={name ?? displayText(query.data.name, locale)}
      href={`/states/${query.data.slug}`}
      slug={query.data.slug}
      color={query.data.color}
      facts={facts}
    />
  );
}
export { StateNameById };
