import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listPublicCurrencies } from '@helicraft/alhena';
import type { ListPublicCurrenciesResponse } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function CurrencyName({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['currency-code-by-id', id],
    queryFn: async () => {
      let after: string | null = null;
      do {
        // oxlint-disable-next-line no-await-in-loop -- Published currencies use an ordered cursor; a later page depends on the previous cursor.
        const { data }: { data: ListPublicCurrenciesResponse } = await listPublicCurrencies({
          client: createClient({ credentials: 'omit' }),
          query: { after: after ?? undefined },
          throwOnError: true,
        });
        const found = data.items.find((item) => item.currency.id === id);
        if (found !== undefined) {
          return found.currency.code;
        }
        after = data.nextCode;
      } while (after !== null);
      return null;
    },
  });
  return <span>{query.data ?? uiText(locale, 'Валюта недоступна', 'Currency unavailable')}</span>;
}
export { CurrencyName };
