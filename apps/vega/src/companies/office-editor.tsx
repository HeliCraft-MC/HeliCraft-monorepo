import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { CompanyOffice, GovernanceVotingRules } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { CompanyProcedureEditor } from './procedure-editor';
import { OfficeIdentityFields } from './office-identity-fields';
import styles from './companies.module.scss';

function CompanyOfficeEditor({
  value,
  offices,
  defaults,
  players,
  onChange,
  onRemove,
  formation = true,
}: Readonly<{
  value: CompanyOffice;
  offices: readonly CompanyOffice[];
  defaults: GovernanceVotingRules;
  players: readonly SelectedPlayer[];
  onChange: (office: CompanyOffice) => void;
  onRemove: (id: string) => void;
  formation?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const holders = useMemo(
    () =>
      [
        ...players,
        ...selectedPlayers.filter((item) => !players.some((player) => player.id === item.id)),
      ].filter((player) => value.initialHolderIds.includes(player.id)),
    [players, selectedPlayers, value.initialHolderIds],
  );
  const selected = useCallback(
    (items: SelectedPlayer[]): void => {
      setSelectedPlayers(items);
      onChange({ ...value, initialHolderIds: items.map((item) => item.id) });
    },
    [value, onChange],
  );
  const appointment = useCallback(
    (procedure: CompanyOffice['appointment']): void => {
      onChange({ ...value, appointment: procedure });
    },
    [value, onChange],
  );
  const removal = useCallback(
    (procedure: CompanyOffice['removal']): void => {
      onChange({ ...value, removal: procedure });
    },
    [value, onChange],
  );
  const remove = useCallback((): void => {
    onRemove(value.id);
  }, [value.id, onRemove]);
  return (
    <article className={styles.card}>
      <OfficeIdentityFields value={value} onChange={onChange} />
      {formation && (
        <PlayerPicker
          label={uiText(locale, 'Первоначальные должностные лица', 'Initial office holders')}
          players={holders}
          onChange={selected}
        />
      )}
      <h4>{uiText(locale, 'Назначение на должность', 'Appointment procedure')}</h4>
      <CompanyProcedureEditor
        value={value.appointment}
        offices={offices}
        defaults={defaults}
        onChange={appointment}
      />
      <h4>{uiText(locale, 'Освобождение от должности', 'Removal procedure')}</h4>
      <CompanyProcedureEditor
        value={value.removal}
        offices={offices}
        defaults={defaults}
        onChange={removal}
      />
      <Button onClick={remove}>
        {uiText(locale, 'Удалить должность из проекта', 'Remove office from draft')}
      </Button>
    </article>
  );
}
export { CompanyOfficeEditor };
