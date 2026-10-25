// oxlint-disable import/max-dependencies -- The protected company page combines legal identity, current server-derived capabilities, named office holders and section navigation.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCompanyWorkspace } from '@helicraft/alhena';
import type { IconProps } from '@helicraft/atria';
import {
  Alert,
  WorkspaceNavigation,
  WorkspaceContent,
  WorkspaceLayout,
  Icon,
} from '@helicraft/atria';
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
const SECTION_ICONS: Readonly<Record<CompanySection, IconProps['name']>> = {
  overview: 'overview',
  governance: 'governance',
  offices: 'users',
  ownership: 'shares',
  decisions: 'vote',
  finance: 'wallet',
  subsidiaries: 'subsidiaries',
  branches: 'branches',
  history: 'history',
  settings: 'settings',
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
  const params = useMemo(() => ({ id }), [id]);
  const searches = useMemo(
    () => new Map(COMPANY_SECTIONS.map((item) => [item, { section: item }])),
    [],
  );
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
  if (query.data === undefined) {
    return (
      <main id="main-content" className={styles.page}>
        {query.isPending ? (
          <p>{uiText(locale, 'Загрузка компании…', 'Loading company…')}</p>
        ) : (
          <Alert tone="danger">{errorMessage(query.error)}</Alert>
        )}
      </main>
    );
  }
  return (
    <WorkspaceLayout
      className={styles.workspaceShell}
      accent={query.data.workspace.content.branding?.color ?? '#859b76'}
    >
      <aside className={styles.workspaceNav}>
        <Link to="/app/companies">
          <Icon name="arrowLeft" /> {uiText(locale, 'Мои компании', 'My companies')}
        </Link>
        <WorkspaceNavigation
          currentLabel={uiText(locale, TITLES[section][0], TITLES[section][1])}
          label={uiText(locale, 'Разделы компании', 'Company workspace sections')}
        >
          {COMPANY_SECTIONS.filter(
            (item) => item !== 'finance' || query.data.workspace.canReadFinance,
          ).map((item) => (
            <Link
              key={item}
              to="/app/companies/$id"
              params={params}
              search={searches.get(item)}
              aria-current={item === section ? 'page' : undefined}
            >
              <Icon name={SECTION_ICONS[item]} />
              {uiText(locale, TITLES[item][0], TITLES[item][1])}
            </Link>
          ))}
        </WorkspaceNavigation>
      </aside>
      <div className={styles.workspaceBody}>
        <header className={styles.workspaceHeader}>
          <div className={styles.workspaceIdentity}>
            {query.data.workspace.content.branding?.logoMediaId !== undefined &&
              query.data.workspace.content.branding.logoMediaId !== null && (
                <img
                  className={styles.logo}
                  src={`/api/v1/account/companies/${id}/media/${query.data.workspace.content.branding.logoMediaId}`}
                  alt=""
                  width="64"
                  height="64"
                />
              )}
            <div>
              <span>{uiText(locale, 'Панель компании', 'Company management')}</span>
              <h1>{displayText(query.data.workspace.content.name, locale)}</h1>
              <p>{companyStatusLabel(query.data.workspace.status, locale)}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <a href="/app/notifications">
              {uiText(locale, 'Входящие согласования', 'Approval inbox')}
            </a>
            <a href={`/companies/${id}`}>{uiText(locale, 'Публичный профиль', 'Public profile')}</a>
          </div>
        </header>{' '}
        <WorkspaceContent className={styles.workspaceContent}>
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
        </WorkspaceContent>
      </div>
    </WorkspaceLayout>
  );
}
export { CompanyWorkspacePage };
