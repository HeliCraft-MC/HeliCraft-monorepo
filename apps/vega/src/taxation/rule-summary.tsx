import type { ReactElement } from 'react';
import type { TaxRule, TaxLawRevision } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { taxEventLabel } from './event-labels';
import { TaxRegimeSummary } from './regime-summary';

function TaxRuleSummary({
  rule,
  subject,
}: Readonly<{ rule: TaxRule; subject?: TaxLawRevision['regimeSubject'] }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <dl>
        <dt>{uiText(locale, 'События', 'Events')}</dt>
        <dd>
          {(rule.events ?? [rule.event]).map((event) => taxEventLabel(event, locale)).join(', ')}
        </dd>
        <dt>{uiText(locale, 'Налогоплательщик', 'Taxpayer')}</dt>
        <dd>
          {rule.taxpayer === 'RECIPIENT'
            ? uiText(
                locale,
                'Получатель: удержание из перевода',
                'Recipient: withholding from transfer',
              )
            : uiText(
                locale,
                'Отправитель: дополнительно к переводу',
                'Sender: charged on top of transfer',
              )}
        </dd>
        <dt>{uiText(locale, 'Налоговая база', 'Tax base')}</dt>
        <dd>
          {rule.base?.kind === 'EXCESS' ? (
            <>
              {uiText(locale, 'Часть суммы сверх порога', 'Amount above allowance')}:{' '}
              <MoneyAmount minor={rule.base.thresholdMinor} code="" locale={locale} />
            </>
          ) : (
            uiText(locale, 'Полная сумма перевода', 'Full transfer amount')
          )}
        </dd>
        <dt>{uiText(locale, 'Получатель налога', 'Tax recipient')}</dt>
        <dd>
          {rule.recipient === 'CENTRAL_BANK'
            ? uiText(locale, 'Центральный банк государства', 'State central bank')
            : uiText(locale, 'Казна государства', 'State treasury')}
        </dd>
      </dl>
      <TaxRegimeSummary rule={rule} subject={subject} />
    </section>
  );
}
export { TaxRuleSummary };
