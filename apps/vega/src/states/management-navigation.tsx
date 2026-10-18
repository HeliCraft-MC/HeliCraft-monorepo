import type { StateDetail } from '@helicraft/alhena';
import { BannerPreview } from './banner-preview';
import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { ManagementSectionLink } from './management-section-link';
import { managementLabels } from './management-labels';
import type { ManagementSection } from './management-sections';
import { ManagementSwitcher } from './management-switcher';
import styles from './management.module.scss';

function ManagementNavigation({
  stateId,
  stateName,
  flag,
  section,
  sections,
}: Readonly<{
  stateId: string;
  stateName: string;
  flag: StateDetail['configuration']['horizontalFlag'];
  section: ManagementSection;
  sections: readonly ManagementSection[];
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <aside className={styles.sidebar}>
      <ManagementSectionLink className={styles.brand} stateId={stateId} section="overview">
        <span className={styles.stateMark} aria-hidden="true">
          {flag.mode === 'BANNER' ? (
            <BannerPreview design={flag.design} horizontal />
          ) : (
            <img src={`/api/v1/account/states/${stateId}/flag`} alt="" />
          )}
        </span>
        <span>
          {stateName}
          <small>{uiText(locale, 'Панель государства', 'State management')}</small>
        </span>
      </ManagementSectionLink>
      <nav
        className={styles.navigation}
        aria-label={uiText(locale, 'Управление государством', 'State management')}
      >
        {sections.map((item) => (
          <ManagementSectionLink
            key={item}
            stateId={stateId}
            section={item}
            current={section === item}
          >
            {uiText(locale, managementLabels[item][0], managementLabels[item][1])}
          </ManagementSectionLink>
        ))}
      </nav>
      <ManagementSwitcher stateId={stateId} stateName={stateName} />
    </aside>
  );
}
export { ManagementNavigation };
