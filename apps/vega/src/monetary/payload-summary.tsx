// oxlint-disable import/max-dependencies -- Immutable economic payload review composes monetary and tax/diplomatic summaries.
import { EconomicPayload } from '../taxation/payload';
import { economicLabels } from '../taxation/model';
import { monetaryLabel } from './labels';
import type { ReactElement } from 'react';
import type { MonetaryDirectivePayload } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { MonetaryPlayer } from './player';
import { PolicySummary } from './policy-summary';
import styles from './monetary.module.scss';

function PayloadSummary({
  payload,
  code,
}: Readonly<{ payload: MonetaryDirectivePayload; code: string }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <div className={styles.panel}>
      {economicLabels[payload.kind] === undefined && <h3>{monetaryLabel(text, payload.kind)}</h3>}
      <EconomicPayload payload={payload} />
      {'name' in payload && (
        <>
          <strong>{displayText(payload.name, locale)}</strong>
          <p>{displayText(payload.description, locale)}</p>
        </>
      )}
      {'code' in payload && <p>{payload.code}</p>}
      {'amountMinor' in payload && (
        <>
          <MoneyAmount minor={payload.amountMinor} code={code} locale={locale} />
          <p>{payload.purpose}</p>
        </>
      )}
      {'recipient' in payload && (
        <p>
          {text('monetary.recipient')}:{' '}
          {payload.recipient.type === 'PLAYER' ? (
            <MonetaryPlayer id={payload.recipient.userId} />
          ) : (
            monetaryLabel(text, payload.recipient.type)
          )}
        </p>
      )}
      {payload.kind === 'CHANGE_POLICY' && <PolicySummary policy={payload.policy} code={code} />}
    </div>
  );
}
export { PayloadSummary };
