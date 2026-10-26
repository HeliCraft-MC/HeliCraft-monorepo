// oxlint-disable import/max-dependencies -- State navigation composes published identity, typed section links and shared workspace controls.
import { isInstitutionSection } from './institution-sections';
import type { IconProps } from '@helicraft/atria';
import { WorkspaceNavigation, Icon } from '@helicraft/atria';
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

const SECTION_ICONS: Readonly<Record<ManagementSection, IconProps['name']>> = {
  institutions: 'state',
  overview: 'overview',
  territory: 'state',
  identity: 'state',
  citizens: 'users',
  government: 'governance',
  constitution: 'constitution',
  appointments: 'appointment',
  proposals: 'vote',
  citizenship: 'user',
  history: 'history',
  bank: 'state',
  currency: 'currency',
  'monetary-policy': 'governance',
  issuance: 'currency',
  'bank-finances': 'wallet',
  treasury: 'wallet',
  taxation: 'tax',
  diplomacy: 'diplomacy',
  fx: 'exchange',
  companies: 'company',
};
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
      <WorkspaceNavigation
        currentLabel={uiText(
          locale,
          managementLabels[isInstitutionSection(section) ? 'institutions' : section][0],
          managementLabels[isInstitutionSection(section) ? 'institutions' : section][1],
        )}
        className={styles.navigation}
        label={uiText(locale, 'Управление государством', 'State management')}
      >
        {sections
          .filter((item) => !isInstitutionSection(item))
          .map((item) => (
            <ManagementSectionLink
              key={item}
              stateId={stateId}
              section={item}
              current={
                section === item || (item === 'institutions' && isInstitutionSection(section))
              }
            >
              <Icon name={SECTION_ICONS[item]} />
              {uiText(locale, managementLabels[item][0], managementLabels[item][1])}
            </ManagementSectionLink>
          ))}
        <ManagementSwitcher stateId={stateId} stateName={stateName} />
      </WorkspaceNavigation>
    </aside>
  );
}
export { ManagementNavigation };
