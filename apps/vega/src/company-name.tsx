import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublishedCompanyIdentity } from '@helicraft/alhena';
import type { CompanyBranding } from '@helicraft/alhena';
import { CompanyName as Name } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { displayText, uiText } from './states/text';

const PREVIEW_STALE_MS = 60_000;
function CompanyName({
  id,
  name,
  href,
  branding,
  description,
  linked = true,
}: Readonly<{
  id: string;
  name?: string;
  href?: string;
  branding?: CompanyBranding;
  description?: string;
  linked?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const [requested, setRequested] = useState(false);
  const request = useCallback((): void => {
    setRequested(true);
  }, []);
  const query = useQuery({
    queryKey: ['published-company-identity', id],
    staleTime: PREVIEW_STALE_MS,
    retry: false,
    enabled: name === undefined || requested,
    queryFn: async () => {
      const result = await getPublishedCompanyIdentity({
        client: createClient({ credentials: 'omit' }),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const identity = query.data;
  const resolvedName =
    name ?? (identity === undefined ? undefined : displayText(identity.name, locale));
  if (resolvedName === undefined) {
    return (
      <span>
        {query.isPending
          ? uiText(locale, 'Загрузка компании…', 'Loading company…')
          : uiText(locale, 'Компания недоступна', 'Company unavailable')}
      </span>
    );
  }
  const visual = branding ?? identity?.branding;
  const logoUrl =
    visual?.logoMediaId === null || visual?.logoMediaId === undefined
      ? undefined
      : `/api/v1/public/companies/${id}/media/${visual.logoMediaId}`;
  return (
    <Name
      name={resolvedName}
      href={href ?? `/companies/${id}`}
      color={visual?.color}
      logoUrl={logoUrl}
      description={
        description ??
        (identity === undefined ? undefined : displayText(identity.description, locale))
      }
      facts={
        identity === undefined ? undefined : displayText(identity.registrationStateName, locale)
      }
      onPreview={request}
      linked={linked}
    />
  );
}
export { CompanyName };
