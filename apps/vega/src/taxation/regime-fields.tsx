import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { TaxRule } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TaxRegimeSubjectFields } from './regime-subject-fields';
import { TaxRegimeClaimField } from './regime-claim-field';

function TaxRegimeFields({
  stateId,
  rule,
}: Readonly<{ stateId: string; rule?: TaxRule }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [mode, setMode] = useState(rule?.regime?.mode ?? 'NONE');
  const changeMode = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.currentTarget;
    if (value === 'NONE' || value === 'EXEMPT' || value === 'REPLACE' || value === 'ADDITIONAL') {
      setMode(value);
    }
  }, []);
  return (
    <fieldset>
      <legend>{uiText(locale, 'Специальные условия компании', 'Company tax treatment')}</legend>
      <FormField
        label={uiText(locale, 'Режим', 'Treatment')}
        htmlFor={id}
        help={uiText(
          locale,
          'Условия действуют только для выбранного юридического лица. Замена или освобождение изменяют одно собственное требование государства; налоги других государств сохраняются. Договоры применяются после национального расчёта.',
          'Treatment applies only to the selected legal entity. Replacement or exemption affects one of this state’s claims; foreign claims remain. Treaties apply after national calculation.',
        )}
      >
        <Select id={id} name="regimeMode" value={mode} onChange={changeMode}>
          <option value="NONE">{uiText(locale, 'Общее правило', 'General rule')}</option>
          <option value="EXEMPT">
            {uiText(locale, 'Освобождение — укажите ставку 0', 'Exemption — set rate to 0')}
          </option>
          <option value="REPLACE">
            {uiText(locale, 'Замена общего требования', 'Replace a general claim')}
          </option>
          <option value="ADDITIONAL">
            {uiText(locale, 'Дополнительное требование', 'Additional claim')}
          </option>
        </Select>
      </FormField>
      {mode !== 'NONE' && (
        <>
          <TaxRegimeSubjectFields stateId={stateId} rule={rule} />
          {mode !== 'ADDITIONAL' && (
            <TaxRegimeClaimField
              stateId={stateId}
              initialLawId={rule?.regime?.targetLawId ?? undefined}
            />
          )}
        </>
      )}
    </fieldset>
  );
}
export { TaxRegimeFields };
