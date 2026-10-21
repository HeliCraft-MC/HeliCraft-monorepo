// oxlint-disable import/max-dependencies -- The protected company page combines legal identity, current server-derived capabilities, named office holders and section navigation.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyWorkspace } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { lookupCorporatePlayers } from './player-directory';
import { companyStatusLabel } from './labels';
import { CompanyWorkspaceSection, COMPANY_SECTIONS } from './workspace-sections';
import type { CompanySection } from './workspace-sections';
import styles from './companies.module.scss';

const TITLES: Readonly<Record<CompanySection, readonly [string, string]>> = {
  overview: ['Обзор', 'Overview'],
  governance: ['Управление', 'Governance'],
  offices: ['Должности', 'Offices'],
  ownership: ['Собственность', 'Ownership'],
  decisions: ['Решения', 'Decisions'],
  finance: ['Финансы', 'Finance'],
  subsidiaries: ['Корпоративное владение', 'Subsidiaries'],
  branches: ['Филиалы', 'Branches'],
  history: ['История', 'History'],
  settings: ['Сведения', 'Settings'],
};
function CompanyWorkspacePage({
  id,
  actorId,
  section,
  shareOperationId,
  formationDraftId,
  votingId,
}: Readonly<{
  id: string;
  actorId: string;
  section: CompanySection;
  shareOperationId?: string;
  formationDraftId?: string;
  votingId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-workspace', id, actorId],
    queryFn: async () => {
      const result = await getCompanyWorkspace({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const players = await lookupCorporatePlayers(
        result.data.holders.map((holder) => holder.userId),
      );
      return { workspace: result.data, players };
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section className={styles.page}>
      {query.isPending && <p>{uiText(locale, 'Загрузка компании…', 'Loading company…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && query.error === null && (
        <>
          <header>
            <h1>{displayText(query.data.workspace.content.name, locale)}</h1>
            <p>{companyStatusLabel(query.data.workspace.status, locale)}</p>
            <a href={`/companies/${id}`}>{uiText(locale, 'Публичный профиль', 'Public profile')}</a>
          </header>
          <nav
            aria-label={uiText(locale, 'Разделы компании', 'Company workspace sections')}
            className={styles.actions}
          >
            {COMPANY_SECTIONS.filter(
              (item) => item !== 'finance' || query.data.workspace.canReadFinance,
            ).map((item) => (
              <a
                key={item}
                href={`/app/companies/${id}?section=${item}`}
                aria-current={item === section ? 'page' : undefined}
              >
                {uiText(locale, TITLES[item][0], TITLES[item][1])}
              </a>
            ))}
          </nav>
          <CompanyWorkspaceSection
            votingId={votingId}
            formationDraftId={formationDraftId}
            shareOperationId={shareOperationId}
            section={section}
            workspace={query.data.workspace}
            players={query.data.players}
            actorId={actorId}
            onSaved={refresh}
          />
        </>
      )}
    </section>
  );
}
export { CompanyWorkspacePage };
