import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { CompanyName } from '../company-name';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';

function MonetaryCompany({
  id,
  initial,
}: Readonly<{ id: string; initial?: PublishedCompanyIdentity }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <CompanyName
      id={id}
      name={initial === undefined ? undefined : displayText(initial.name, locale)}
      branding={initial?.branding}
    />
  );
}
export { MonetaryCompany };
