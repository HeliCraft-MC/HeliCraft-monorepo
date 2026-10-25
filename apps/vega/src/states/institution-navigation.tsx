import type { ReactElement } from 'react';
import { WorkspaceNavigation, Icon } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { ManagementSectionLink } from './management-section-link';
import { managementLabels } from './management-labels';
import { institutionCatalogue } from './institution-catalogue';
import type { InstitutionSection } from './institution-sections';
import styles from './states.module.scss';

function InstitutionNavigation({
  stateId,
  sections,
  section,
}: Readonly<{
  stateId: string;
  sections: readonly InstitutionSection[];
  section: InstitutionSection | 'institutions';
}>): ReactElement {
  const { locale } = useTranslation();
  const links = sections.map((item) => (
    <ManagementSectionLink key={item} stateId={stateId} section={item} current={item === section}>
      <Icon name={institutionCatalogue[item].icon} />
      <span>
        <strong>{uiText(locale, managementLabels[item][0], managementLabels[item][1])}</strong>
        {section === 'institutions' && (
          <small>
            {uiText(
              locale,
              institutionCatalogue[item].description[0],
              institutionCatalogue[item].description[1],
            )}
          </small>
        )}
      </span>
    </ManagementSectionLink>
  ));
  if (section === 'institutions') {
    return (
      <nav
        className={styles.institutionGrid}
        aria-label={uiText(locale, 'Институты государства', 'State institutions')}
      >
        {links}
      </nav>
    );
  }
  return (
    <WorkspaceNavigation
      label={uiText(locale, 'Инструменты институтов', 'Institution tools')}
      currentLabel={uiText(locale, managementLabels[section][0], managementLabels[section][1])}
      className={styles.institutionNavigation}
    >
      <ManagementSectionLink stateId={stateId} section="institutions">
        <Icon name="overview" />
        {uiText(locale, 'Все институты', 'All institutions')}
      </ManagementSectionLink>
      {links}
    </WorkspaceNavigation>
  );
}
export { InstitutionNavigation };
