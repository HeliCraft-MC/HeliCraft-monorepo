import type { ReactElement } from 'react';
import type { CompanyConfiguration } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';
import { CompanyStateIdentity } from './state-identity';
import { CompanyCharterSummary } from './charter-summary';

function CompanyFormationSummary({
  configuration,
}: Readonly<{ configuration: CompanyConfiguration }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h2>
        {displayText(configuration.name, locale) ||
          uiText(locale, 'Компания без названия', 'Unnamed company')}
      </h2>
      <p>{displayText(configuration.description, locale)}</p>
      {configuration.registrationStateId !== null && (
        <CompanyStateIdentity id={configuration.registrationStateId} />
      )}
      <p>{configuration.categories.join(', ')}</p>
      <h3>{uiText(locale, 'Первоначальная собственность', 'Initial ownership')}</h3>
      <p>
        {uiText(locale, 'Выпуск акций', 'Issued shares')}: {configuration.totalShares}
      </p>
      <ul>
        {configuration.allocations.map((allocation) => (
          <li key={`${allocation.owner.type}:${allocation.owner.id}`}>
            <CompanyOwnerIdentity owner={allocation.owner} /> · {allocation.shares} /{' '}
            {configuration.totalShares}
          </li>
        ))}
      </ul>
      <CompanyCharterSummary charter={configuration.charter} />
      {Object.keys(configuration.document).length > 0 && (
        <>
          <h3>{uiText(locale, 'Формальный устав', 'Formal charter')}</h3>
          <pre>{displayText(configuration.document, locale)}</pre>
        </>
      )}
    </section>
  );
}
export { CompanyFormationSummary };
