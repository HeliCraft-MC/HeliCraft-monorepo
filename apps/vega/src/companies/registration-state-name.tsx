import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { StateName } from '../state-name';

function RegistrationStateName({
  company,
}: Readonly<{ company: PublishedCompanyIdentity }>): ReactElement {
  const { locale } = useTranslation();
  const name = displayText(company.registrationStateName, locale);
  return company.registrationStateSlug === undefined ? (
    <span>{name}</span>
  ) : (
    <StateName
      name={name}
      href={`/states/${company.registrationStateSlug}`}
      slug={company.registrationStateSlug}
      color={company.registrationStateColor ?? 'var(--primary)'}
    />
  );
}
export { RegistrationStateName };
