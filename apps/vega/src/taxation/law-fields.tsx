import { useId } from 'react';
import type { ReactElement } from 'react';
import type { TaxLawRevision } from '@helicraft/alhena';
import { FormField, TextField, Select, Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

const DEFAULT_RATE_BPS = 500;

function TaxLawFields({ revision }: Readonly<{ revision?: TaxLawRevision }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  return (
    <div className={styles.form}>
      <FormField
        label={uiText(locale, 'Событие', 'Event')}
        htmlFor={`${id}-event`}
        help={uiText(
          locale,
          'Поддерживается только личный перевод. Эмиссия, казённые платежи и сами налоги не облагаются.',
          'Only personal transfers are supported. Issuance, treasury payments and taxes are excluded.',
        )}
      >
        <Select id={`${id}-event`} name="event">
          <option value="PLAYER_TRANSFER">
            {uiText(locale, 'Личный перевод', 'Personal transfer')}
          </option>
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Налогоплательщик и база', 'Taxpayer and base')}
        htmlFor={`${id}-payer`}
        help={uiText(
          locale,
          'Отправитель платит налог дополнительно от исходной суммы. Получатель получает полный перевод.',
          'The sender pays on top of the original amount. The recipient receives the full transfer.',
        )}
      >
        <TextField
          id={`${id}-payer`}
          readOnly
          value={uiText(
            locale,
            'Отправитель · исходная сумма перевода',
            'Sender · original transfer amount',
          )}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Категория налога', 'Tax category')}
        htmlFor={`${id}-category`}
        help={uiText(
          locale,
          'Стабильный код связывает национальные требования с областью договора. Несколько разных законов могут действовать одновременно.',
          'A stable code connects national claims to treaty scope. Several independent laws may apply together.',
        )}
      >
        <TextField
          id={`${id}-category`}
          name="category"
          required
          pattern="[A-Z][A-Z0-9_]{0,63}"
          maxLength={64}
          defaultValue={revision?.rule.category ?? 'TRANSFER'}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Налоговая юрисдикция', 'Tax jurisdiction')}
        htmlFor={`${id}-basis`}
        help={uiText(
          locale,
          'Гражданство применяется ко всем действующим гражданствам. Территориальное правило пока использует тот же список с явной пометкой временной стратегии.',
          'Citizenship uses every current citizenship. Territorial rules currently use the same list with an explicit proxy label.',
        )}
      >
        <Select
          id={`${id}-basis`}
          name="basis"
          defaultValue={revision?.rule.jurisdictions[0] ?? 'CITIZENSHIP'}
        >
          <option value="CITIZENSHIP">{uiText(locale, 'Гражданство', 'Citizenship')}</option>
          <option value="TERRITORIAL">
            {uiText(
              locale,
              'Территория — временно по гражданству',
              'Territory — temporary citizenship proxy',
            )}
          </option>
          <option value="BOTH">
            {uiText(locale, 'Оба основания — один налог', 'Both bases — one tax')}
          </option>
        </Select>
      </FormField>
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
          '100 базисных пунктов = 1%. Диапазон 0–10000. Результат округляется вниз до минимальной единицы; нулевой налог сохраняется без денежной проводки.',
          '100 basis points = 1%. Range 0–10000. Tax rounds down to a minor unit; zero assessments retain evidence without a payment.',
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
          'Казна получает валюту перевода, включая иностранную. Автоматического обмена нет.',
          'The treasury receives the transfer currency, including foreign currency. No conversion occurs.',
        )}
      >
        <TextField
          id={`${id}-recipient`}
          readOnly
          value={uiText(locale, 'Казна государства', 'State treasury')}
        />
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
        <TextField id={`${id}-date`} name="effectiveAt" type="datetime-local" required />
      </FormField>
    </div>
  );
}
export { TaxLawFields };
