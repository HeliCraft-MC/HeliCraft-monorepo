import type { ReactElement } from 'react';
import type { CompanyRegistrationPolicy } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CurrencyName } from './currency-name';
import { founderRule, branchRule } from './policy-labels';

function PolicyTerms({ policy }: Readonly<{ policy: CompanyRegistrationPolicy }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <dl>
      <dt>{uiText(locale, 'Регистрация', 'Registration')}</dt>
      <dd>
        {policy.companyMode === 'FREE'
          ? uiText(locale, 'Свободная при соблюдении правил', 'Free when all requirements are met')
          : uiText(locale, 'Государственное одобрение', 'State approval required')}
      </dd>
      <dt>{uiText(locale, 'Иностранные игроки', 'Foreign player founders')}</dt>
      <dd>
        {policy.foreignPlayerFounders === 'ALLOW'
          ? uiText(locale, 'Разрешены', 'Allowed')
          : uiText(locale, 'Запрещены', 'Denied')}
      </dd>
      <dt>{uiText(locale, 'Компании-учредители', 'Corporate founders')}</dt>
      <dd>{founderRule(policy.corporateFounders, locale, 'corporate')}</dd>
      <dt>{uiText(locale, 'Государства-учредители', 'State founders')}</dt>
      <dd>{founderRule(policy.stateFounders, locale, 'state')}</dd>
      <dt>{uiText(locale, 'Филиалы', 'Branches')}</dt>
      <dd>{branchRule(policy.branchMode, locale)}</dd>
      <dt>{uiText(locale, 'Иностранные филиалы', 'Foreign branches')}</dt>
      <dd>
        {policy.foreignBranches === 'ALLOW'
          ? uiText(locale, 'Разрешены', 'Allowed')
          : uiText(locale, 'Запрещены', 'Denied')}
      </dd>
      <dt>{uiText(locale, 'Сбор с заявителя', 'Applicant fee')}</dt>
      <dd>
        {policy.registrationFee === null ? (
          uiText(locale, 'Без сбора', 'No fee')
        ) : (
          <>
            <MoneyAmount minor={policy.registrationFee.amountMinor} code="" locale={locale} />{' '}
            <CurrencyName id={policy.registrationFee.currencyId} />
          </>
        )}
      </dd>
    </dl>
  );
}
export { PolicyTerms };
