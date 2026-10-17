import type { ReactElement } from 'react';
import { FieldHelp, MoneyAmount } from '@helicraft/atria';
import type { MonetaryPolicy } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

function PolicySummary({
  policy,
  code,
}: Readonly<{ policy: MonetaryPolicy | null; code: string }>): ReactElement {
  const { text, locale } = useTranslation();
  if (policy === null) {
    return <p>{text('monetary.noPolicy')}</p>;
  }
  const limits = [
    {
      label: text('monetary.maxSupply'),
      help: text('monetary.maxSupplyHelp'),
      value: policy.maxSupplyMinor,
    },
    {
      label: text('monetary.maxGross'),
      help: text('monetary.maxGrossHelp'),
      value: policy.maxGrossIssuance30dMinor,
    },
    {
      label: text('monetary.maxOperation'),
      help: text('monetary.maxOperationHelp'),
      value: policy.maxIssuancePerOperationMinor,
    },
  ];
  return (
    <dl className={styles.facts}>
      {limits.map((limit) => (
        <div key={limit.label}>
          <dt>
            {limit.label} <FieldHelp label={limit.label} content={limit.help} />
          </dt>
          <dd>
            {limit.value === null ? (
              text('monetary.unlimited')
            ) : (
              <MoneyAmount minor={limit.value} code={code} locale={locale} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export { PolicySummary };
