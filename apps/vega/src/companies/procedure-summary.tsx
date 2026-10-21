import type { ReactElement } from 'react';
import type { CompanyAuthorityProcedure, CompanyCharter } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import { companyProcedureLabel } from './labels';

function CompanyProcedureSummary({
  procedure,
  offices,
}: Readonly<{
  procedure: CompanyAuthorityProcedure;
  offices: CompanyCharter['offices'];
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <div>
      <p>{companyProcedureLabel(procedure.mechanism, locale)}</p>
      {procedure.officeIds.length > 0 && (
        <ul>
          {procedure.officeIds.map((id) => (
            <li key={id}>
              {displayText(offices.find((office) => office.id === id)?.name ?? {}, locale)}
            </li>
          ))}
        </ul>
      )}
      {procedure.vote !== null && (
        <p>
          {uiText(locale, 'Кворум', 'Quorum')}: {procedure.vote.quorumPercent}%.{' '}
          {uiText(locale, 'Порог', 'Threshold')}: {label(procedure.vote.thresholdKind, locale)} (
          {procedure.vote.thresholdPercent}%).{' '}
          {uiText(locale, 'Продолжительность, ч', 'Duration, hours')}:{' '}
          {procedure.vote.durationHours}. {uiText(locale, 'Воздержание', 'Abstention')}:{' '}
          {procedure.vote.allowAbstain
            ? uiText(locale, 'разрешено', 'allowed')
            : uiText(locale, 'не разрешено', 'not allowed')}
          .
        </p>
      )}
      {procedure.mechanism === 'MANUAL' && <p>{displayText(procedure.manualProcedure, locale)}</p>}
    </div>
  );
}
export { CompanyProcedureSummary };
