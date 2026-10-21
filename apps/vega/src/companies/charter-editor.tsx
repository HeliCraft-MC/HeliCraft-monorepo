// oxlint-disable import/max-dependencies -- The charter composition exposes independent office, policy, voting and transfer-rule editors; presets only initialize editable data.
import { useCallback, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyCharter, CompanyOffice } from '@helicraft/alhena';
import { Button, FieldHelp, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { VotingRulesEditor } from '../states/voting-rules';
import type { SelectedPlayer } from '../player-picker';
import { newCompanyOffice, charterPreset } from './charter-model';
import { CompanyOfficeEditor } from './office-editor';
import { CompanyPoliciesEditor } from './policies-editor';

function CompanyCharterEditor({
  value,
  actorId,
  players,
  onChange,
  formation = true,
}: Readonly<{
  value: CompanyCharter;
  actorId: string;
  players: readonly SelectedPlayer[];
  onChange: (charter: CompanyCharter) => void;
  formation?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => ({ value, onChange }), [value, onChange]);
  const officeChange = usePropCache<(office: CompanyOffice) => void>(scope);
  const preset = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const kind = event.currentTarget.value;
      if (kind === 'SHAREHOLDERS' || kind === 'OFFICER') {
        onChange(charterPreset(kind, value.votingDefaults, actorId));
      }
    },
    [value.votingDefaults, actorId, onChange],
  );
  const add = useCallback((): void => {
    onChange({ ...value, offices: [...value.offices, newCompanyOffice()] });
  }, [value, onChange]);
  const remove = useCallback(
    (id: string): void => {
      onChange({ ...value, offices: value.offices.filter((office) => office.id !== id) });
    },
    [value, onChange],
  );
  const defaults = useCallback(
    (rules: CompanyCharter['votingDefaults']): void => {
      onChange({ ...value, votingDefaults: rules });
    },
    [value, onChange],
  );
  const transfer = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const next = event.currentTarget.value;
      if (next === 'OWNER_CONSENT' || next === 'CORPORATE_APPROVAL') {
        onChange({ ...value, shareTransfers: next });
      }
    },
    [value, onChange],
  );
  return (
    <section>
      {formation && (
        <FormField
          label={uiText(
            locale,
            'Начать с шаблона (заменяет текущий проект)',
            'Start from a preset (replaces current draft)',
          )}
          htmlFor="company-charter-preset"
        >
          <Select id="company-charter-preset" value="" onChange={preset}>
            <option value="">{uiText(locale, 'Выбрать шаблон', 'Choose a preset')}</option>
            <option value="SHAREHOLDERS">
              {uiText(
                locale,
                'Акционерное управление без должностей',
                'Shareholder governance without offices',
              )}
            </option>
            <option value="OFFICER">
              {uiText(
                locale,
                'Один уполномоченный представитель',
                'Single authorized representative',
              )}
            </option>
          </Select>
        </FormField>
      )}
      <FieldHelp
        label={uiText(locale, 'Гибкое управление', 'Flexible governance')}
        content={uiText(
          locale,
          'Шаблон только заполняет проект. Добавляйте или удаляйте должности, меняйте каждую процедуру. Не заполненные полномочия не выдаются автоматически.',
          'A preset only initializes the draft. Add or remove offices and edit each procedure. Missing authority is never granted automatically.',
        )}
      />
      <h3>{uiText(locale, 'Должности', 'Corporate offices')}</h3>
      <FieldHelp
        label={uiText(locale, 'Устав и корпоративная должность', 'Charter and corporate office')}
        content={uiText(
          locale,
          'Машинный устав определяет действия и порядок одобрения. Должность даёт только явно назначенные ей полномочия на срок назначения. Изменение названия должности или формального текста устава не выдаёт новых прав.',
          'The machine-readable charter defines actions and approval procedures. An office grants only its explicitly assigned powers during a valid appointment. Renaming an office or editing formal charter prose grants no new rights.',
        )}
      />
      {value.offices.map((office) => (
        <CompanyOfficeEditor
          key={office.id}
          formation={formation}
          value={office}
          offices={value.offices}
          defaults={value.votingDefaults}
          players={players}
          onRemove={remove}
          onChange={officeChange(office.id, (next) => {
            onChange({
              ...value,
              offices: value.offices.map((item) => (item.id === next.id ? next : item)),
            });
          })}
        />
      ))}
      <Button onClick={add}>{uiText(locale, 'Добавить должность', 'Add office')}</Button>
      <h3>{uiText(locale, 'Общие правила голосования', 'Default voting rules')}</h3>
      <VotingRulesEditor value={value.votingDefaults} onChange={defaults} />
      <CompanyPoliciesEditor value={value} onChange={onChange} />
      <FormField
        label={uiText(locale, 'Передача акций', 'Share transfer rule')}
        htmlFor="company-share-rule"
      >
        <Select id="company-share-rule" value={value.shareTransfers} onChange={transfer}>
          <option value="OWNER_CONSENT">
            {uiText(locale, 'По согласию владельца и получателя', 'Owner and recipient consent')}
          </option>
          <option value="CORPORATE_APPROVAL">
            {uiText(
              locale,
              'Дополнительно требуется решение компании',
              'Company approval also required',
            )}
          </option>
        </Select>
      </FormField>
    </section>
  );
}
export { CompanyCharterEditor };
