import { useId } from 'react';
import type { ReactElement } from 'react';
import type { TaxLawRevision } from '@helicraft/alhena';
import { FormField, TextField, Select, Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TaxLiabilityFields } from './liability-fields';
import { TaxScopeFields } from './scope-fields';
import { TaxCategoryField } from './category-field';
import { TaxRegimeFields } from './regime-fields';
import styles from '../monetary/monetary.module.scss';

const DEFAULT_RATE_BPS = 500;

function TaxLawFields({
  revision,
  stateId,
}: Readonly<{ revision?: TaxLawRevision; stateId?: string }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  return (
    <div className={styles.form}>
      <TaxScopeFields rule={revision?.rule} />
      <TaxLiabilityFields rule={revision?.rule} />
      <TaxCategoryField value={revision?.rule.category} />
      {stateId !== undefined && <TaxRegimeFields stateId={stateId} rule={revision?.rule} />}
      <Alert>
        {uiText(
          locale,
          'До подключения игровой географии территориальная принадлежность временно определяется по гражданству. Фактическое местоположение игрока не проверяется.',
          'Until game geography is connected, territorial jurisdiction temporarily follows citizenship. Physical location is not verified.',
        )}
      </Alert>
      <FormField
        label={uiText(locale, 'Ставка, базисные пункты', 'Rate, basis points')}
        htmlFor={`${id}-rate`}
        help={uiText(
          locale,
          '100 базисных пунктов = 1%. Диапазон 0–10000. Дробная часть налога накапливается до целой минимальной единицы и не исчезает при мелких переводах. Нулевое взыскание сохраняется без денежной проводки.',
          '100 basis points = 1%. Range 0–10000. Fractional tax accumulates until a whole minor unit is due and is retained across tiny transfers. Zero collections retain evidence without a payment.',
        )}
      >
        <TextField
          id={`${id}-rate`}
          name="rateBps"
          type="number"
          min="0"
          max="10000"
          step="1"
          required
          defaultValue={revision?.rule.rateBps ?? DEFAULT_RATE_BPS}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Получатель налога', 'Tax recipient')}
        htmlFor={`${id}-recipient`}
        help={uiText(
          locale,
          'Выбранный официальный счёт получает валюту перевода, включая иностранную. Центральный банк должен быть действующим. Если он недоступен, перевод отклоняется без перенаправления налога.',
          'The selected official account receives the transfer currency, including foreign currency. A central bank must be active. If unavailable, the transfer fails without redirecting tax.',
        )}
      >
        <Select
          id={`${id}-recipient`}
          name="taxRecipient"
          defaultValue={revision?.rule.recipient ?? 'STATE_TREASURY'}
        >
          <option value="STATE_TREASURY">
            {uiText(locale, 'Казна государства', 'State treasury')}
          </option>
          <option value="CENTRAL_BANK">
            {uiText(locale, 'Центральный банк государства', 'State central bank')}
          </option>
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Дата вступления в силу', 'Effective date')}
        htmlFor={`${id}-date`}
        help={uiText(
          locale,
          'Закон действует после завершения государственного решения и указанной даты. История переводов не пересчитывается.',
          'The law applies after state approval and this date. Past transfers are never recalculated.',
        )}
      >
        <TextField
          id={`${id}-date`}
          name="effectiveAt"
          type="datetime-local"
          step="0.001"
          required
        />
      </FormField>
    </div>
  );
}
export { TaxLawFields };
