import type { ReactElement } from 'react';
import type { TaxClaim } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { taxEvidenceLabel } from './event-labels';

const PERCENT_BPS = 100;
function TaxClaimEvidence({
  claim,
  code,
}: Readonly<{ claim: TaxClaim; code: string }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <div>
      <a href={`/tax-laws/${claim.regime?.lawId ?? claim.lawId}`}>
        {displayText(claim.name, locale)}
      </a>{' '}
      · {claim.rateBps / PERCENT_BPS}%
      {claim.regime === undefined ? (
        <span> · № {claim.revision}</span>
      ) : (
        <p>
          {uiText(locale, 'Редакция специального правила', 'Special rule revision')}:{' '}
          {claim.regime.revisionId} ·{' '}
          <a href={`/tax-laws/${claim.lawId}`}>
            {uiText(locale, 'Общее требование', 'General claim')} · № {claim.revision}
          </a>
        </p>
      )}
      <p>
        {uiText(locale, 'Национальное начисление до договора', 'National assessment before treaty')}
        : <MoneyAmount minor={claim.nationalAmountMinor} code={code} locale={locale} />
      </p>
      {claim.evidence.map((evidence) => (
        <p key={`${evidence.stateId}:${evidence.basis}`}>{taxEvidenceLabel(evidence, locale)}</p>
      ))}
    </div>
  );
}
export { TaxClaimEvidence };
