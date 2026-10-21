import type { ReactElement } from 'react';
import type { TaxRule, TaxLawRevision } from '@helicraft/alhena';
import { MonetaryCompany } from '../monetary/company';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function TaxRegimeSummary({
  rule,
  subject,
}: Readonly<{ rule: TaxRule; subject?: TaxLawRevision['regimeSubject'] }>): ReactElement | null {
  const { locale } = useTranslation();
  if (rule.regime === undefined) {
    return null;
  }
  const labels = {
    EXEMPT: ['Освобождение', 'Exemption'],
    REPLACE: ['Замена общего требования', 'Replaces a general claim'],
    ADDITIONAL: ['Дополнительное требование', 'Additional claim'],
  } as const;
  const pair = labels[rule.regime.mode];
  const mode = uiText(locale, pair[0], pair[1]);
  return (
    <section>
      <h4>{mode}</h4>
      <p>
        {subject === undefined ? (
          <MonetaryCompany id={rule.regime.companyId} />
        ) : (
          <a href={`/companies/${rule.regime.companyId}`}>
            {displayText(subject.companyName, locale)}
          </a>
        )}
      </p>
      {subject?.branchName !== null && subject?.branchName !== undefined && (
        <p>
          {uiText(locale, 'Филиал', 'Branch')}: {displayText(subject.branchName, locale)}
        </p>
      )}
      {rule.regime.targetLawId !== null && (
        <a href={`/tax-laws/${rule.regime.targetLawId}`}>
          {uiText(locale, 'Изменяемое общее требование', 'General claim changed')}
        </a>
      )}
      <p>
        {uiText(
          locale,
          'Условия не распространяются автоматически на дочерние компании. Иностранные обязательства определяются отдельно.',
          'Treatment does not extend automatically to subsidiaries. Foreign obligations are determined separately.',
        )}
      </p>
    </section>
  );
}
export { TaxRegimeSummary };
