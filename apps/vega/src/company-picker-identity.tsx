import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { StateName } from '@helicraft/atria';
import { CompanyName } from './company-name';
import { useTranslation } from './i18n';
import { displayText } from './states/text';

function CompanyPickerIdentity({
  company,
}: Readonly<{ company: PublishedCompanyIdentity }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <span>
      <CompanyName
        id={company.id}
        name={displayText(company.name, locale)}
        branding={company.branding}
        linked={false}
      />{' '}
      ·{' '}
      <StateName
        name={displayText(company.registrationStateName, locale)}
        color={company.registrationStateColor ?? 'var(--primary)'}
        href={
          company.registrationStateSlug === undefined
            ? ''
            : `/states/${company.registrationStateSlug}`
        }
        linked={false}
      />
    </span>
  );
}
export { CompanyPickerIdentity };
