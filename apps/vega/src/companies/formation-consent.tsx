import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  consentToCompanyFormation,
  listCompanyFormationConsents,
  revokeCompanyFormationConsent,
} from '@helicraft/alhena';
import type { CompanyDraft } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function FormationConsent({
  draft,
  consentRole,
}: Readonly<{ draft: CompanyDraft; consentRole: 'FOUNDER' | 'OFFICE_HOLDER' }>): ReactElement {
  const { locale } = useTranslation();
  const queries = useQueryClient();
  const query = useQuery({
    queryKey: ['company-formation-consents', draft.id],
    queryFn: async () => {
      const result = await listCompanyFormationConsents({
        client: browserClient(),
        path: { id: draft.id },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const current =
    query.data?.filter(
      (item) =>
        item.role === consentRole &&
        item.formationHash === draft.formationHash &&
        item.revokedAt === null,
    ) ?? [];
  const { refetch } = query;
  const mutation = useMutation({
    mutationFn: async (revoke: boolean): Promise<void> => {
      if (revoke) {
        await Promise.all(
          current.map(async (consent) => {
            await revokeCompanyFormationConsent({
              client: browserClient(),
              path: { id: consent.id },
              throwOnError: true,
            });
          }),
        );
        return;
      }
      await consentToCompanyFormation({
        client: browserClient(),
        path: { id: draft.id },
        body: {
          role: consentRole,
          formationHash: draft.formationHash,
          idempotencyKey: crypto.randomUUID(),
        },
        throwOnError: true,
      });
    },
    onSuccess: async () => {
      await refetch();
      await queries.invalidateQueries({ queryKey: ['company-formation-progress', draft.id] });
      await queries.invalidateQueries({ queryKey: ['company-inbox'] });
    },
  });
  const { mutate } = mutation;
  const grant = useCallback((): void => {
    mutate(false);
  }, [mutate]);
  const revoke = useCallback((): void => {
    mutate(true);
  }, [mutate]);
  return (
    <section>
      <Button
        onClick={grant}
        disabled={query.isPending || query.isError || mutation.isPending || current.length > 0}
      >
        {consentRole === 'FOUNDER'
          ? uiText(locale, 'Согласиться стать собственником', 'Consent to initial ownership')
          : uiText(locale, 'Согласиться занять должность', 'Consent to initial office')}
      </Button>
      {current.length > 0 && (
        <>
          <p>
            {uiText(
              locale,
              'Согласие сохранено для этих точных условий.',
              'Consent saved for these exact terms.',
            )}
          </p>
          <Button onClick={revoke} disabled={mutation.isPending}>
            {uiText(locale, 'Отозвать согласие', 'Revoke consent')}
          </Button>
        </>
      )}
      {(query.error !== null || mutation.error !== null) && (
        <Alert tone="danger">{errorMessage(query.error ?? mutation.error)}</Alert>
      )}
    </section>
  );
}
export { FormationConsent };
