import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublishedCompanyIdentity } from '@helicraft/alhena';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

const STALE_MS = 60_000;
function MonetaryCompany({
  id,
  initial,
}: Readonly<{ id: string; initial?: PublishedCompanyIdentity }>): ReactElement {
  const { locale } = useTranslation();
  const profile = useQuery({
    queryKey: ['published-company-identity', id],
    staleTime: STALE_MS,
    retry: false,
    initialData: initial?.id === id ? initial : undefined,
    queryFn: async () => {
      const result = await getPublishedCompanyIdentity({
        client: createClient({ credentials: 'omit' }),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <span>
      {profile.data === undefined
        ? uiText(locale, 'Компания недоступна', 'Company unavailable')
        : `${displayText(profile.data.name, locale)} · ${displayText(profile.data.registrationStateName, locale)}`}
    </span>
  );
}
export { MonetaryCompany };
