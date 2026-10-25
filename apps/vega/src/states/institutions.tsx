import { lazy, Suspense, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { LoadingState } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { managementSections } from './management-access';
import { InstitutionNavigation } from './institution-navigation';
import { isInstitutionSection } from './institution-sections';
import type { ManagementSection } from './management-sections';
import styles from './states.module.scss';

const Money = lazy(async () => {
  const module = await import('../monetary/state-workspace');
  return { default: module.StateMonetaryWorkspace };
});
const Taxes = lazy(async () => {
  const module = await import('../taxation/workspace');
  return { default: module.TaxationWorkspace };
});
const Exchange = lazy(async () => {
  const module = await import('../fx/state-workspace');
  return { default: module.StateFxWorkspace };
});
const Companies = lazy(async () => {
  const module = await import('../companies/state-workspace');
  return { default: module.StateCompanyWorkspace };
});
function StateInstitutions({
  state,
  actorId,
  section,
  votingId,
  shareOperationId,
  formationDraftId,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  section: ManagementSection;
  votingId?: string;
  shareOperationId?: string;
  formationDraftId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const loading = useMemo(
    () => <LoadingState label={uiText(locale, 'Загрузка института…', 'Loading institution…')} />,
    [locale],
  );
  const available = useMemo(
    () => managementSections(state, actorId).filter((item) => isInstitutionSection(item)),
    [state, actorId],
  );
  return (
    <section className={styles.editor}>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Институты государства: деньги, налоги и регистрация компаний. Доступные инструменты определяются вашими действующими полномочиями.',
          'State institutions: money, taxation and company registration. Available tools follow your current authority.',
        )}
      </p>
      <InstitutionNavigation
        stateId={state.id}
        sections={available}
        section={isInstitutionSection(section) ? section : 'institutions'}
      />
      <Suspense fallback={loading}>
        {section === 'taxation' && <Taxes state={state} actorId={actorId} />}
        {section === 'fx' && <Exchange state={state} actorId={actorId} />}
        {section === 'companies' && (
          <Companies
            state={state}
            actorId={actorId}
            votingId={votingId}
            shareOperationId={shareOperationId}
            formationDraftId={formationDraftId}
          />
        )}
        {isInstitutionSection(section) &&
          section !== 'taxation' &&
          section !== 'fx' &&
          section !== 'companies' && <Money state={state} actorId={actorId} section={section} />}
      </Suspense>
    </section>
  );
}
export { StateInstitutions };
