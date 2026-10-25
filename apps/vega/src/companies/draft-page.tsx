// oxlint-disable import/max-dependencies -- Corporate draft loading combines participant identity, versioned editing, immutable review and real player names.
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyDraft } from '@helicraft/alhena';
import type { Principal } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { lookupCorporatePlayers } from './player-directory';
import { CompanyWizard } from './wizard';
import { CompanyFormationSummary } from './formation-summary';
import styles from './companies.module.scss';
import { CompanyFormationConsents } from './formation-consents';

function CompanyDraftPage({
  id,
  principal,
}: Readonly<{ id: string; principal: Principal }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    // An editor must initialize from a fresh version after returning from approvals or another draft.
    staleTime: 0,
    gcTime: 0,
    queryKey: ['company-draft', id, principal.id],
    queryFn: async () => {
      const result = await getCompanyDraft({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const ids = [
        ...new Set([
          principal.id,
          ...result.data.configuration.charter.offices.flatMap((office) => office.initialHolderIds),
        ]),
      ];
      const players = await lookupCorporatePlayers(ids);
      return { draft: result.data, players };
    },
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка черновика…', 'Loading company draft…')}</p>;
  }
  if (query.data === undefined) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const { draft, players } = query.data;
  if (draft.submittedApplicationId !== null) {
    return (
      <a href={`/app/companies/applications/${draft.submittedApplicationId}`}>
        {uiText(locale, 'Заявка уже подана. Открыть статус', 'Registration submitted. View status')}
      </a>
    );
  }
  return draft.ownerId === principal.id ? (
    <CompanyWizard key={draft.id} initial={draft} principal={principal} players={players} />
  ) : (
    <section className={styles.page}>
      <CompanyFormationSummary configuration={draft.configuration} companyId={draft.companyId} />
      <CompanyFormationConsents draft={draft} actorId={principal.id} />
    </section>
  );
}
export { CompanyDraftPage };
