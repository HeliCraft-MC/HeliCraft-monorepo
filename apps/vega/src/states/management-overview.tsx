import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Users, Landmark, UserCheck, Armchair } from 'lucide-react';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import { ManagementIdentity } from './management-identity';
import { managementSections } from './management-access';
import { managementLabels } from './management-labels';
import { ManagementSectionLink } from './management-section-link';
import styles from './management.module.scss';

function ManagementOverview({
  state,
  actorId,
  onReform,
  pending,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  onReform: () => void;
  pending: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const sections = managementSections(state, actorId);
  const { offices } = state.configuration.governance;
  const vacancies = offices.reduce(
    (count, office) =>
      count +
      Math.max(
        0,
        office.maxHolders - state.holders.filter((holder) => holder.officeId === office.id).length,
      ),
    0,
  );
  const metrics = [
    {
      section: 'citizens' as const,
      label: uiText(locale, 'Граждане', 'Citizens'),
      value: state.citizens.length,
      icon: Users,
    },
    {
      section: 'government' as const,
      label: uiText(locale, 'Должности', 'Offices'),
      value: offices.length,
      icon: Landmark,
    },
    {
      section: 'government' as const,
      label: uiText(locale, 'Занятые места', 'Occupied seats'),
      value: state.holders.length,
      icon: UserCheck,
    },
    {
      section: sections.includes('appointments')
        ? ('appointments' as const)
        : ('government' as const),
      label: uiText(locale, 'Свободные места', 'Vacant seats'),
      value: vacancies,
      icon: Armchair,
    },
  ];
  const myOffices = offices.filter((office) =>
    state.holders.some((holder) => holder.officeId === office.id && holder.userId === actorId),
  );
  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <ManagementSectionLink
            key={metric.label}
            className={styles.metric}
            stateId={state.id}
            section={metric.section}
          >
            <metric.icon size={22} aria-hidden="true" />
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </ManagementSectionLink>
        ))}
      </div>
      <div className={styles.dashboardColumns}>
        <ManagementIdentity state={state} onReform={onReform} pending={pending} />
        <section className={styles.card}>
          <h2>{uiText(locale, 'Ваше участие', 'Your participation')}</h2>
          <span className={styles.role}>{uiText(locale, 'Гражданин', 'Citizen')}</span>
          {myOffices.map((office) => (
            <span className={styles.role} key={office.id}>
              {displayText(office.name, locale)}
            </span>
          ))}
          <div className={styles.quickActions}>
            {sections
              .filter((item) =>
                ['proposals', 'appointments', 'treasury', 'taxation', 'diplomacy'].includes(item),
              )
              .map((item) => (
                <ManagementSectionLink key={item} stateId={state.id} section={item}>
                  <span>
                    {uiText(locale, managementLabels[item][0], managementLabels[item][1])}
                  </span>
                  <span aria-hidden="true">→</span>
                </ManagementSectionLink>
              ))}
          </div>
          <ManagementSectionLink stateId={state.id} section="citizenship">
            {uiText(locale, 'Управлять гражданством', 'Manage citizenship')}
          </ManagementSectionLink>
        </section>
      </div>
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>{uiText(locale, 'Действующие должности', 'Current offices')}</h2>
          <ManagementSectionLink stateId={state.id} section="government">
            {uiText(locale, 'Все правила →', 'All rules →')}
          </ManagementSectionLink>
        </div>
        {offices.length === 0 && (
          <p>{uiText(locale, 'Должности пока не учреждены.', 'No offices established yet.')}</p>
        )}
        <div className={styles.officeList}>
          {offices.map((office) => {
            const holders = state.holders.filter((holder) => holder.officeId === office.id);
            return (
              <div key={office.id} className={styles.officeRow}>
                <div>
                  <strong>{displayText(office.name, locale)}</strong>
                  <small>
                    {office.isHeadOfState
                      ? uiText(locale, 'Глава государства', 'Head of state')
                      : uiText(locale, 'Государственная должность', 'State office')}
                  </small>
                </div>
                <span>
                  {holders.length === 0
                    ? uiText(locale, 'Вакантна', 'Vacant')
                    : holders.map((holder) => holder.name).join(', ')}
                </span>
                <span>
                  {holders.length}/{office.maxHolders}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export { ManagementOverview };
