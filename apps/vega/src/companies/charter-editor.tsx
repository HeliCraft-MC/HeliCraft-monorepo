// oxlint-disable import/max-dependencies -- The charter composition selects independent office, policy, voting and transfer editors with one shared localization scope.
import { useCallback, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyCharter } from '@helicraft/alhena';
import { FormField, Select, Tabs } from '@helicraft/atria';
import type { TabItem } from '@helicraft/atria';
import { ContentLanguageScope } from '../content-language-scope';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { VotingRulesEditor } from '../states/voting-rules';
import type { SelectedPlayer } from '../player-picker';
import { CompanyCharterOffices } from './charter-offices';
import { CompanyCharterPreset } from './charter-preset';
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
  const items = useMemo<readonly TabItem[]>(
    () => [
      {
        id: 'offices',
        label: uiText(locale, 'Должности', 'Offices'),
        content: (
          <CompanyCharterOffices
            value={value}
            players={players}
            onChange={onChange}
            formation={formation}
          />
        ),
      },
      {
        id: 'authority',
        label: uiText(locale, 'Полномочия', 'Authority'),
        content: <CompanyPoliciesEditor value={value} onChange={onChange} />,
      },
      {
        id: 'voting',
        label: uiText(locale, 'Голосования', 'Voting'),
        content: <VotingRulesEditor value={value.votingDefaults} onChange={defaults} />,
      },
      {
        id: 'shares',
        label: uiText(locale, 'Передача акций', 'Share transfers'),
        content: (
          <FormField
            label={uiText(locale, 'Передача акций', 'Share transfer rule')}
            htmlFor="company-share-rule"
          >
            <Select id="company-share-rule" value={value.shareTransfers} onChange={transfer}>
              <option value="OWNER_CONSENT">
                {uiText(
                  locale,
                  'По согласию владельца и получателя',
                  'Owner and recipient consent',
                )}
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
        ),
      },
    ],
    [locale, value, players, onChange, formation, defaults, transfer],
  );
  return (
    <ContentLanguageScope>
      {formation && <CompanyCharterPreset value={value} actorId={actorId} onChange={onChange} />}
      <p>
        {uiText(
          locale,
          'Настройте должности, их полномочия и общие правила. Шаблон заполняет проект; отсутствующие полномочия запрещены.',
          'Configure offices, authority and shared rules. Presets initialize the draft; missing authority is denied.',
        )}
      </p>
      <Tabs items={items} label={uiText(locale, 'Разделы устава', 'Charter sections')} />
    </ContentLanguageScope>
  );
}
export { CompanyCharterEditor };
