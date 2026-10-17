import formStyles from './form.module.scss';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { TreatyContent } from '@helicraft/alhena';
import { Alert, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

const DEFAULT_SHARED_RATE_BPS = 600;

const DEFAULT_SHARE_BPS = 5000;

type TreatyTermsProps = Readonly<{
  stateId: string;
  partnerId: string;
  firstLabel: string;
  secondLabel: string;
  content?: TreatyContent;
}>;

function TreatyTerms({
  stateId,
  partnerId,
  firstLabel,
  secondLabel,
  content,
}: TreatyTermsProps): ReactElement {
  const { locale } = useTranslation();
  const [mode, setMode] = useState(content?.terms.mode ?? 'EXCLUSIVE');
  const change = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.currentTarget;
    if (value === 'EXCLUSIVE' || value === 'SHARED') {
      setMode(value);
    }
  }, []);
  return (
    <fieldset className={formStyles.step}>
      <legend>{uiText(locale, '3. Условия договора', '3. Treaty terms')}</legend>
      <FormField
        label={uiText(locale, 'Налоговый механизм', 'Tax mechanism')}
        htmlFor="treaty-mode"
        help={uiText(
          locale,
          'Исключительное право оставляет налог одной стороны. Распределение заменяет охваченные национальные налоги общей ставкой; это не дополнительный налог.',
          'Exclusive rights retain one party’s tax. Sharing replaces covered national taxes with one rate; it is not an additional tax.',
        )}
      >
        <Select id="treaty-mode" name="mode" value={mode} onChange={change}>
          <option value="EXCLUSIVE">
            {uiText(locale, 'Исключительное налогообложение', 'Exclusive taxation')}
          </option>
          <option value="SHARED">
            {uiText(locale, 'Распределение налоговых поступлений', 'Shared tax revenue')}
          </option>
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Категория налоговых требований', 'National claim category')}
        htmlFor="treaty-category"
        help={uiText(
          locale,
          'Договор применяется только к совпадающим требованиям обеих сторон в этой категории личных переводов. Он не создаёт обязательств для посторонних лиц и не отменяет налоги третьих стран.',
          'The treaty applies only when both parties have national claims in this personal-transfer category. It creates no claim against other people and preserves third-state taxes.',
        )}
      >
        <TextField
          id="treaty-category"
          name="category"
          defaultValue={content?.category ?? 'TRANSFER'}
          pattern="[A-Z][A-Z0-9_]{0,63}"
          required
        />
      </FormField>
      {mode === 'EXCLUSIVE' ? (
        <FormField
          label={uiText(locale, 'Государство с исключительным правом', 'Exclusive taxing state')}
          htmlFor="treaty-exclusive"
        >
          <Select
            id="treaty-exclusive"
            name="taxingStateId"
            defaultValue={
              content?.terms.mode === 'EXCLUSIVE' ? content.terms.taxingStateId : stateId
            }
          >
            <option value={stateId}>{firstLabel}</option>
            <option value={partnerId}>{secondLabel}</option>
          </Select>
        </FormField>
      ) : (
        <>
          <FormField
            label={uiText(locale, 'Общая ставка, базисные пункты', 'Shared rate, basis points')}
            htmlFor="treaty-rate"
            help={uiText(
              locale,
              '100 пунктов = 1%; налог округляется вниз до минимальной единицы.',
              '100 points = 1%; tax rounds down to the minor unit.',
            )}
          >
            <TextField
              id="treaty-rate"
              name="rateBps"
              type="number"
              min="0"
              max="10000"
              step="1"
              defaultValue={
                content?.terms.mode === 'SHARED' ? content.terms.rateBps : DEFAULT_SHARED_RATE_BPS
              }
              required
            />
          </FormField>
          <FormField
            label={uiText(
              locale,
              'Доля первой стороны, базисные пункты',
              'First party share, basis points',
            )}
            htmlFor="treaty-share"
            help={uiText(
              locale,
              '10000 = 100%. Остаток доли принадлежит второй стороне. Остаток минимальной денежной единицы также получает вторая сторона. Порядок сторон после создания неизменен.',
              '10000 = 100%. The second party receives the remaining share and any indivisible minor unit. Party order is immutable after creation.',
            )}
          >
            <TextField
              id="treaty-share"
              name="firstShareBps"
              type="number"
              min="0"
              max="10000"
              step="1"
              defaultValue={
                content?.terms.mode === 'SHARED' ? content.terms.firstShareBps : DEFAULT_SHARE_BPS
              }
              required
            />
          </FormField>
        </>
      )}
      <FormField
        label={uiText(locale, 'Дата вступления в силу', 'Effective date')}
        htmlFor="treaty-date"
        help={uiText(
          locale,
          'Договор начинает применяться только после независимого утверждения одной редакции обеими сторонами и наступления этой даты.',
          'Application starts only after both parties independently ratify the same revision and this date arrives.',
        )}
      >
        <TextField id="treaty-date" name="effectiveAt" type="datetime-local" required />
      </FormField>
      <FormField
        label={uiText(locale, 'Окончание действия (необязательно)', 'Expiry (optional)')}
        htmlFor="treaty-expiry"
      >
        <TextField id="treaty-expiry" name="expiresAt" type="datetime-local" />
      </FormField>
      <Alert>
        {uiText(
          locale,
          'Изменение или прекращение требует согласия обеих сторон. Пересечение действующих договоров проверяет Антарес; при конфликте соглашение не активируется.',
          'Amendment or termination requires both parties. Antares checks overlapping active treaties and refuses conflicting activation.',
        )}
      </Alert>
    </fieldset>
  );
}
export { TreatyTerms };
