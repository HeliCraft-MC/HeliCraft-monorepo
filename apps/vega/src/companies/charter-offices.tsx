import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { CompanyCharter, CompanyOffice } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import type { SelectedPlayer } from '../player-picker';
import { newCompanyOffice } from './charter-model';
import { CompanyOfficeEditor } from './office-editor';

function CompanyCharterOffices({
  value,
  players,
  onChange,
  formation,
}: Readonly<{
  value: CompanyCharter;
  players: readonly SelectedPlayer[];
  onChange: (value: CompanyCharter) => void;
  formation: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => ({ value, onChange }), [value, onChange]);
  const change = usePropCache<(office: CompanyOffice) => void>(scope);
  const add = useCallback((): void => {
    onChange({ ...value, offices: [...value.offices, newCompanyOffice()] });
  }, [value, onChange]);
  const remove = useCallback(
    (id: string): void => {
      onChange({ ...value, offices: value.offices.filter((office) => office.id !== id) });
    },
    [value, onChange],
  );
  return (
    <section>
      <h3>{uiText(locale, 'Должности', 'Corporate offices')}</h3>
      <p>
        {uiText(
          locale,
          'Должность получает только явно назначенные полномочия. Назначение человека и изменение устава — отдельные действия.',
          'An office receives only explicit authority. Appointing a person and amending the charter are separate actions.',
        )}
      </p>
      {value.offices.map((office) => (
        <CompanyOfficeEditor
          key={office.id}
          formation={formation}
          value={office}
          offices={value.offices}
          defaults={value.votingDefaults}
          players={players}
          onRemove={remove}
          onChange={change(office.id, (next) => {
            onChange({
              ...value,
              offices: value.offices.map((item) => (item.id === next.id ? next : item)),
            });
          })}
        />
      ))}
      <Button onClick={add}>{uiText(locale, 'Добавить должность', 'Add office')}</Button>
    </section>
  );
}
export { CompanyCharterOffices };
