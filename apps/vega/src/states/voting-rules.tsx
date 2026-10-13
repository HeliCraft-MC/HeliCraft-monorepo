import { uiText } from './text';
import { MAX_DURATION_HOURS, PERCENT } from './limits';
import { useMemo, useId } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';
import type { GovernanceVotingRules } from '@helicraft/alhena';
import { Checkbox, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function VotingRulesEditor({
  value,
  onChange,
  showDuration = true,
}: Readonly<{
  showDuration?: boolean;
  value: GovernanceVotingRules;
  onChange: (value: GovernanceVotingRules) => void;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const callbackScope1 = useMemo(
    () => [value, onChange, id, locale],
    [value, onChange, id, locale],
  );
  const cacheTextFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(callbackScope1);
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  const cacheCheckboxOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(callbackScope1);
  return (
    <section className={styles.grid}>
      {showDuration && (
        <FormField
          htmlFor={`${id}-duration`}
          label={uiText(locale, 'Продолжительность, часов', 'Duration in hours')}
        >
          <TextField
            id={`${id}-duration`}
            type="number"
            min={1}
            max={MAX_DURATION_HOURS}
            value={value.durationHours}
            onChange={cacheTextFieldOnChange('892', (event) => {
              onChange({ ...value, durationHours: Number(event.currentTarget.value) });
            })}
          />
        </FormField>
      )}
      <FormField htmlFor={`${id}-quorum`} label={uiText(locale, 'Кворум, %', 'Quorum, %')}>
        <TextField
          id={`${id}-quorum`}
          type="number"
          min={0}
          max={PERCENT}
          value={value.quorumPercent}
          onChange={cacheTextFieldOnChange('1298', (event) => {
            onChange({ ...value, quorumPercent: Number(event.currentTarget.value) });
          })}
        />
      </FormField>
      <FormField
        htmlFor={`${id}-threshold`}
        label={uiText(locale, 'Порог одобрения, %', 'Approval threshold, %')}
      >
        <TextField
          id={`${id}-threshold`}
          type="number"
          min={1}
          max={PERCENT}
          disabled={value.thresholdKind !== 'PERCENT'}
          value={value.thresholdPercent}
          onChange={cacheTextFieldOnChange('1757', (event) => {
            onChange({ ...value, thresholdPercent: Number(event.currentTarget.value) });
          })}
        />
      </FormField>
      <FormField
        htmlFor={`${id}-kind`}
        label={uiText(locale, 'Правило одобрения', 'Approval rule')}
      >
        <Select
          id={`${id}-kind`}
          value={value.thresholdKind}
          onChange={cacheSelectOnChange('2132', (event) => {
            const kind = event.currentTarget.value;
            if (
              kind === 'PERCENT' ||
              kind === 'SIMPLE_MAJORITY' ||
              kind === 'ABSOLUTE_MAJORITY' ||
              kind === 'UNANIMOUS'
            ) {
              onChange({ ...value, thresholdKind: kind });
            }
          })}
        >
          <option value="PERCENT">
            {uiText(locale, 'Указанный процент', 'Specified percentage')}
          </option>
          <option value="SIMPLE_MAJORITY">
            {uiText(locale, 'Простое большинство', 'Simple majority')}
          </option>
          <option value="ABSOLUTE_MAJORITY">
            {uiText(locale, 'Абсолютное большинство', 'Absolute majority')}
          </option>
          <option value="UNANIMOUS">{uiText(locale, 'Единогласно', 'Unanimous')}</option>
        </Select>
      </FormField>
      <Checkbox
        label={uiText(locale, 'Разрешить воздержаться', 'Allow abstention')}
        checked={value.allowAbstain}
        onChange={cacheCheckboxOnChange('3167', (event) => {
          onChange({ ...value, allowAbstain: event.currentTarget.checked });
        })}
      />
    </section>
  );
}
export { VotingRulesEditor };
