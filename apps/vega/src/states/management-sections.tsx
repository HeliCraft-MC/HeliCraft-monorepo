// oxlint-disable import/max-dependencies -- The workspace selects independent, typed state tools.
import { lazy, Suspense, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Button, LoadingState } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { ManagementOverview } from './management-overview';
import { ManagementCitizens } from './management-citizens';
import { ManagementMembership } from './management-membership';
import { ManagementHistory } from './management-history';
import { PublicGovernment } from './public-government';
import { uiText } from './text';
import styles from './states.module.scss';

const TaxationWorkspace = lazy(async () => {
  const module = await import('../taxation/workspace');
  return { default: module.TaxationWorkspace };
});
const DiplomacyWorkspace = lazy(async () => {
  const module = await import('../diplomacy/workspace');
  return { default: module.DiplomacyWorkspace };
});
const StateMonetaryWorkspace = lazy(async () => {
  const module = await import('../monetary/state-workspace');
  return { default: module.StateMonetaryWorkspace };
});
const StateFxWorkspace = lazy(async () => {
  const module = await import('../fx/state-workspace');
  return { default: module.StateFxWorkspace };
});
const StateCompanyWorkspace = lazy(async () => {
  const module = await import('../companies/state-workspace');
  return { default: module.StateCompanyWorkspace };
});
const OfficeAssignments = lazy(async () => {
  const module = await import('./office-assignments');
  return { default: module.OfficeAssignments };
});
const StateProposalsPage = lazy(async () => {
  const module = await import('./proposals-page');
  return { default: module.StateProposalsPage };
});

const MANAGEMENT_SECTIONS = [
  'overview',
  'identity',
  'citizens',
  'government',
  'constitution',
  'appointments',
  'proposals',
  'citizenship',
  'history',
  'bank',
  'currency',
  'monetary-policy',
  'issuance',
  'bank-finances',
  'treasury',
  'taxation',
  'diplomacy',
  'fx',
  'companies',
] as const;
type ManagementSection = (typeof MANAGEMENT_SECTIONS)[number];
function ManagementSections({
  state,
  actorId,
  section,
  onReform,
  pending,
  shareOperationId,
  formationDraftId,
  votingId,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  section: ManagementSection;
  onReform: () => void;
  pending: boolean;
  shareOperationId?: string;
  formationDraftId?: string;
  votingId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const fallback = useMemo(
    () => <LoadingState label={uiText(locale, 'Загрузка раздела…', 'Loading section…')} />,
    [locale],
  );
  let content: ReactElement = (
    <ManagementOverview state={state} actorId={actorId} onReform={onReform} pending={pending} />
  );
  if (section === 'taxation') {
    content = <TaxationWorkspace state={state} actorId={actorId} />;
  } else if (section === 'diplomacy') {
    content = <DiplomacyWorkspace state={state} actorId={actorId} />;
  } else if (section === 'fx') {
    content = <StateFxWorkspace state={state} actorId={actorId} />;
  } else if (section === 'companies') {
    content = (
      <StateCompanyWorkspace
        state={state}
        actorId={actorId}
        votingId={votingId}
        formationDraftId={formationDraftId}
        shareOperationId={shareOperationId}
      />
    );
  } else if (
    section === 'bank' ||
    section === 'currency' ||
    section === 'monetary-policy' ||
    section === 'issuance' ||
    section === 'bank-finances' ||
    section === 'treasury'
  ) {
    content = <StateMonetaryWorkspace state={state} actorId={actorId} section={section} />;
  } else if (section === 'appointments') {
    content = <OfficeAssignments state={state} />;
  } else if (section === 'proposals') {
    content = <StateProposalsPage stateId={state.id} actorId={actorId} embedded />;
  } else if (section === 'history') {
    content = <ManagementHistory stateId={state.id} />;
  } else if (section === 'citizenship') {
    content = <ManagementMembership state={state} actorId={actorId} />;
  } else if (section === 'citizens') {
    content = <ManagementCitizens state={state} />;
  } else if (section === 'government') {
    content = (
      <section className={styles.editor}>
        {state.status === 'ACTIVE' && (
          <Button onClick={onReform} disabled={pending}>
            {uiText(locale, 'Изменить устройство государства', 'Propose government changes')}
          </Button>
        )}
        <PublicGovernment state={state} />
      </section>
    );
  }
  return <Suspense fallback={fallback}>{content}</Suspense>;
}
export { ManagementSections, MANAGEMENT_SECTIONS, type ManagementSection };
