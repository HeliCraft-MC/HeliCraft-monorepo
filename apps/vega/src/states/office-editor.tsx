// oxlint-disable import/max-dependencies -- The existing screen also composes the shared player nickname/head component.
import { PlayerNickname } from '../player-nickname';
import { uiText, displayText, label } from './text';
import { PERCENT, DEFAULT_TERM_DAYS } from './limits';

import { useMemo, useId } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import type { StateOffice } from '@helicraft/alhena';
import { Button, Checkbox, FormField, Select, TextField } from '@helicraft/atria';
import { LocalizedInputField } from './localized-input';
import { useTranslation } from '../i18n';
import type { SelectedPlayer } from '../player-picker';
import styles from './states.module.scss';

const appointments = [
  'APPOINTED_BY_OFFICE',
  'CITIZEN_VOTE',
  'COUNCIL_VOTE',
  'MANUAL_PROCEDURE',
] as const;
const vacancies = ['APPOINTMENT', 'ELECTION', 'COUNCIL', 'MANUAL'] as const;
const MOVE_UP = -1;
// oxlint-disable-next-line max-lines-per-function -- Bounded declarative form composition keeps labels, fields and actions together; persistence and domain validation are separate.
function OfficeEditor({
  office,
  offices,
  founders,
  onChange,
  onRemove,
  onMove,
  position,
  rules = false,
}: Readonly<{
  office: StateOffice;
  offices: readonly StateOffice[];
  founders: readonly SelectedPlayer[];
  onChange: (office: StateOffice) => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  position: number;
  rules?: boolean;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const holderLabels = useMemo(
    () =>
      new Map(
        founders.map((founder) => [
          founder.id,
          <PlayerNickname key={founder.id} id={founder.id} name={founder.name} linked={false} />,
        ]),
      ),
    [founders],
  );
  const callbackScope1 = useMemo(
    () => [office, offices, founders, onChange, onRemove, onMove, position, rules, id, locale],
    [office, offices, founders, onChange, onRemove, onMove, position, rules, id, locale],
  );
  const cacheLocalizedInputFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(
      callbackScope1,
    );
  const cacheCheckboxOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(callbackScope1);
  const cacheTextFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(callbackScope1);
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  if (!rules) {
    return (
      <section className={styles.card}>
        <LocalizedInputField
          label={uiText(locale, 'Название должности', 'Office name')}
          value={office.name}
          onChange={cacheLocalizedInputFieldOnChange('1327', (name) => {
            onChange({ ...office, name });
          })}
        />
        <LocalizedInputField
          label={uiText(locale, 'Описание должности', 'Office description')}
          value={office.description}
          onChange={cacheLocalizedInputFieldOnChange('1572', (description) => {
            onChange({ ...office, description });
          })}
          multiline
        />
        <Checkbox
          label={uiText(locale, 'Глава государства', 'Head of state')}
          checked={office.isHeadOfState}
          onChange={cacheCheckboxOnChange('1838', (event) => {
            onChange({ ...office, isHeadOfState: event.currentTarget.checked });
          })}
        />
        <Checkbox
          label={uiText(locale, 'Обязательная должность', 'Required office')}
          checked={office.required}
          onChange={cacheCheckboxOnChange('2111', (event) => {
            onChange({ ...office, required: event.currentTarget.checked });
          })}
        />
        <FormField
          htmlFor={`${id}-seats`}
          label={uiText(locale, 'Количество мест', 'Maximum holders')}
        >
          <TextField
            id={`${id}-seats`}
            type="number"
            min={1}
            max={PERCENT}
            value={office.maxHolders}
            onChange={cacheTextFieldOnChange('2541', (event) => {
              onChange({ ...office, maxHolders: Number(event.currentTarget.value) });
            })}
          />
        </FormField>
        <div className={styles.actions}>
          <Button
            tone="quiet"
            disabled={position === 0}
            onClick={cacheButtonOnClick('2832', () => {
              onMove(MOVE_UP);
            })}
          >
            ↑
          </Button>
          <Button
            tone="quiet"
            disabled={position === offices.length - 1}
            onClick={cacheButtonOnClick('3046', () => {
              onMove(1);
            })}
          >
            ↓
          </Button>
          <Button tone="quiet" onClick={onRemove}>
            {uiText(locale, 'Удалить должность', 'Remove office')}
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className={styles.card}>
      <h3>{displayText(office.name, locale)}</h3>
      <fieldset>
        <legend>{uiText(locale, 'Первые должностные лица', 'Initial holders')}</legend>
        {founders.map((founder) => (
          <Checkbox
            key={founder.id}
            label={holderLabels.get(founder.id)}
            checked={office.initialHolderIds.includes(founder.id)}
            onChange={cacheCheckboxOnChange(rowKey('3736', founder), (event) => {
              onChange({
                ...office,
                initialHolderIds: event.currentTarget.checked
                  ? [...office.initialHolderIds, founder.id]
                  : office.initialHolderIds.filter((holderId) => holderId !== founder.id),
              });
            })}
          />
        ))}
      </fieldset>
      <FormField
        htmlFor={`${id}-appointment`}
        label={uiText(locale, 'Назначение преемника', 'Successor appointment')}
      >
        <Select
          id={`${id}-appointment`}
          value={office.appointment}
          onChange={cacheSelectOnChange('4345', (event) => {
            const appointment = appointments.find((item) => item === event.currentTarget.value);
            if (appointment) {
              onChange({ ...office, appointment });
            }
          })}
        >
          {appointments.map((item) => (
            <option key={item} value={item}>
              {label(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      {(office.appointment === 'APPOINTED_BY_OFFICE' || office.appointment === 'COUNCIL_VOTE') && (
        <FormField
          htmlFor={`${id}-authority`}
          label={uiText(locale, 'Назначающая должность', 'Appointing office')}
        >
          <Select
            id={`${id}-authority`}
            value={office.appointingOfficeId ?? ''}
            onChange={cacheSelectOnChange('5117', (event) => {
              onChange({ ...office, appointingOfficeId: event.currentTarget.value || null });
            })}
          >
            <option value="">—</option>
            {offices.map((item) => (
              <option key={item.id} value={item.id}>
                {displayText(item.name, locale)}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <FormField htmlFor={`${id}-term`} label={uiText(locale, 'Срок полномочий', 'Term')}>
        <Select
          id={`${id}-term`}
          value={office.term}
          onChange={cacheSelectOnChange('5708', (event) => {
            onChange({
              ...office,
              term: event.currentTarget.value === 'FIXED_TERM' ? 'FIXED_TERM' : 'INDEFINITE',
              termDays: event.currentTarget.value === 'FIXED_TERM' ? DEFAULT_TERM_DAYS : null,
            });
          })}
        >
          <option value="INDEFINITE">{label('INDEFINITE', locale)}</option>
          <option value="FIXED_TERM">{label('FIXED_TERM', locale)}</option>
        </Select>
      </FormField>
      {office.term === 'FIXED_TERM' && (
        <FormField htmlFor={`${id}-days`} label={uiText(locale, 'Срок, дней', 'Term in days')}>
          <TextField
            id={`${id}-days`}
            type="number"
            min={1}
            value={office.termDays ?? ''}
            onChange={cacheTextFieldOnChange('6472', (event) => {
              onChange({ ...office, termDays: Number(event.currentTarget.value) });
            })}
          />
        </FormField>
      )}
      <FormField
        htmlFor={`${id}-vacancy`}
        label={uiText(locale, 'Процедура при вакансии', 'Vacancy procedure')}
      >
        <Select
          id={`${id}-vacancy`}
          value={office.vacancy}
          onChange={cacheSelectOnChange('6867', (event) => {
            const vacancy = vacancies.find((item) => item === event.currentTarget.value);
            if (vacancy) {
              onChange({ ...office, vacancy });
            }
          })}
        >
          {vacancies.map((item) => (
            <option key={item} value={item}>
              {label(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        htmlFor={`${id}-inactivity`}
        label={uiText(
          locale,
          'Порог отсутствия, дней (необязательно)',
          'Inactivity threshold in days (optional)',
        )}
        hint={uiText(
          locale,
          'Позволяет инициировать преемственность; не снимает с должности автоматически.',
          'Allows initiating succession; does not remove a holder automatically.',
        )}
      >
        <TextField
          id={`${id}-inactivity`}
          type="number"
          min={1}
          value={office.inactivityDays ?? ''}
          onChange={cacheTextFieldOnChange('7862', (event) => {
            onChange({
              ...office,
              inactivityDays:
                event.currentTarget.value === '' ? null : Number(event.currentTarget.value),
            });
          })}
        />
      </FormField>
    </section>
  );
}

export { OfficeEditor };
