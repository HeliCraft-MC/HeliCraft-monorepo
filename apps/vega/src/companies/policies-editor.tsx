import { useCallback, useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { CompanyCharter, CompanyAuthorityPolicy } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { COMPANY_ACTIONS, shareholderProcedure } from './charter-model';
import { companyActionLabel } from './labels';
import { CompanyProcedureEditor } from './procedure-editor';
import { FinancialBandsEditor } from './financial-bands-editor';

function CompanyPoliciesEditor({
  value,
  onChange,
}: Readonly<{ value: CompanyCharter; onChange: (value: CompanyCharter) => void }>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => ({ value, onChange }), [value, onChange]);
  const change =
    usePropCache<NonNullable<ComponentProps<typeof CompanyProcedureEditor>['onChange']>>(scope);
  const bands = usePropCache<(items: CompanyAuthorityPolicy['financialBands']) => void>(scope);
  const click = usePropCache<() => void>(scope);
  const update = useCallback(
    (policy: CompanyAuthorityPolicy): void => {
      onChange({
        ...value,
        policies: value.policies.map((item) => (item.action === policy.action ? policy : item)),
      });
    },
    [value, onChange],
  );
  return (
    <section>
      <h3>{uiText(locale, 'Полномочия', 'Authority policies')}</h3>
      <p>
        {uiText(
          locale,
          'Отсутствующее полномочие запрещено. Каждый порядок можно настроить отдельно.',
          'Missing authority is denied. Configure each action independently.',
        )}
      </p>
      {COMPANY_ACTIONS.map((action) => {
        const policy = value.policies.find((item) => item.action === action);
        return (
          <details key={action}>
            <summary>
              {companyActionLabel(action, locale)} ·{' '}
              {policy
                ? uiText(locale, 'Настроено', 'Configured')
                : uiText(locale, 'Запрещено', 'Denied')}
            </summary>
            {policy === undefined ? (
              <Button
                onClick={click(action, () => {
                  onChange({
                    ...value,
                    policies: [
                      ...value.policies,
                      { action, procedure: shareholderProcedure(), financialBands: [] },
                    ],
                  });
                })}
              >
                {uiText(locale, 'Настроить полномочие', 'Configure authority')}
              </Button>
            ) : (
              <>
                <CompanyProcedureEditor
                  value={policy.procedure}
                  offices={value.offices}
                  defaults={value.votingDefaults}
                  onChange={change(action, (procedure) => {
                    update({ ...policy, procedure });
                  })}
                />
                {action === 'TRANSFER_FUNDS' && (
                  <FinancialBandsEditor
                    value={policy.financialBands}
                    offices={value.offices}
                    defaults={value.votingDefaults}
                    onChange={bands(action, (financialBands) => {
                      update({ ...policy, financialBands });
                    })}
                  />
                )}
                <Button
                  onClick={click(`${action}-remove`, () => {
                    onChange({
                      ...value,
                      policies: value.policies.filter((item) => item.action !== action),
                    });
                  })}
                >
                  {uiText(locale, 'Запретить действие', 'Deny action')}
                </Button>
              </>
            )}
          </details>
        );
      })}
    </section>
  );
}
export { CompanyPoliciesEditor };
