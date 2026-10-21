import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { LegalOwner, PublishedCompanyIdentity } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { CompanyPicker } from '../company-picker';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyJurisdictionPicker } from './jurisdiction-picker';
import { CompanyOwnerIdentity } from './owner-identity';

function CompanyOwnerPicker({
  value,
  type,
  onType,
  onChange,
  purpose = 'OWNERSHIP',
}: Readonly<{
  value: LegalOwner | null;
  type: LegalOwner['type'];
  onType: (type: LegalOwner['type']) => void;
  onChange: (owner: LegalOwner | null) => void;
  purpose?: 'OWNERSHIP' | 'RECIPIENT';
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const players = useMemo((): SelectedPlayer[] => [], []);
  const changeType = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const next = event.currentTarget.value;
      if (next === 'PLAYER' || next === 'COMPANY' || next === 'STATE') {
        onType(next);
        onChange(null);
      }
    },
    [onType, onChange],
  );
  const player = useCallback(
    (items: SelectedPlayer[]): void => {
      const [selected] = items;
      onChange(selected === undefined ? null : { type: 'PLAYER', id: selected.id });
    },
    [onChange],
  );
  const company = useCallback(
    (item: PublishedCompanyIdentity | null): void => {
      onChange(item === null ? null : { type: 'COMPANY', id: item.id });
    },
    [onChange],
  );
  const state = useCallback(
    (stateId: string): void => {
      onChange({ type: 'STATE', id: stateId });
    },
    [onChange],
  );
  return (
    <section>
      <FormField
        label={
          purpose === 'RECIPIENT'
            ? uiText(locale, 'Тип получателя', 'Recipient type')
            : uiText(locale, 'Тип собственника', 'Owner type')
        }
        htmlFor={id}
      >
        <Select id={id} value={type} onChange={changeType}>
          <option value="PLAYER">{uiText(locale, 'Игрок', 'Player')}</option>
          <option value="COMPANY">{uiText(locale, 'Компания', 'Company')}</option>
          <option value="STATE">{uiText(locale, 'Государство', 'State')}</option>
        </Select>
      </FormField>
      {value !== null && (
        <p>
          {uiText(locale, 'Выбран', 'Selected')}: <CompanyOwnerIdentity owner={value} />
        </p>
      )}
      {type === 'PLAYER' && (
        <PlayerPicker
          label={
            purpose === 'RECIPIENT'
              ? uiText(locale, 'Найти получателя', 'Find recipient')
              : uiText(locale, 'Найти собственника', 'Find owner')
          }
          players={players}
          onChange={player}
        />
      )}
      {type === 'COMPANY' && (
        <CompanyPicker
          value={null}
          onChange={company}
          label={
            purpose === 'RECIPIENT'
              ? uiText(locale, 'Компания-получатель', 'Recipient company')
              : uiText(locale, 'Компания-собственник', 'Corporate owner')
          }
        />
      )}
      {type === 'STATE' && (
        <CompanyJurisdictionPicker
          value={value?.type === 'STATE' ? value.id : null}
          onChange={state}
          label={
            purpose === 'RECIPIENT'
              ? uiText(locale, 'Государство-получатель', 'Recipient state')
              : uiText(locale, 'Государство-собственник', 'State owner')
          }
        />
      )}
    </section>
  );
}
export { CompanyOwnerPicker };
