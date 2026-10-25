import { Icon } from '@helicraft/atria';
import type { ReactElement } from 'react';
import type { CompanyShareOperation } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryCompany } from '../monetary/company';
import { CompanyOwnerIdentity } from './owner-identity';

function ShareOperationSummary({
  operation,
}: Readonly<{ operation: CompanyShareOperation }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <p>
        {uiText(locale, 'Эмитент', 'Issuer')}: <MonetaryCompany id={operation.issuerId} />
      </p>
      <p>
        {uiText(locale, 'Точное количество акций', 'Exact share quantity')}: {operation.shares}
      </p>
      {operation.kind === 'TRANSFER' ? (
        <p>
          <CompanyOwnerIdentity owner={operation.owner} /> <Icon name="arrowRight" />{' '}
          <CompanyOwnerIdentity owner={operation.recipient} />
        </p>
      ) : (
        <ul>
          {operation.allocations.map((allocation) => (
            <li key={`${allocation.owner.type}:${allocation.owner.id}`}>
              <CompanyOwnerIdentity owner={allocation.owner} />: {allocation.shares}
            </li>
          ))}
        </ul>
      )}
      <p>
        {uiText(
          locale,
          'Согласие получателя относится только к этим условиям. Оплата акций не включена в передачу.',
          'Recipient consent covers only these terms. Share transfer does not include a payment.',
        )}
      </p>
    </section>
  );
}
export { ShareOperationSummary };
