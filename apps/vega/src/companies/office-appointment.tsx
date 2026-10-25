import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { ActionPanel, Alert, Button, FormField, Select } from '@helicraft/atria';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyDecisionReview } from './decision-review';
import { useCompanyDecisionSubmission } from './use-decision-submission';

function CompanyOfficeAppointment({
  workspace,
  players,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  players: readonly SelectedPlayer[];
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [officeId, setOfficeId] = useState('');
  const [selected, setSelected] = useState<SelectedPlayer[]>([]);
  const [removed, setRemoved] = useState('');
  const [replacement, setReplacement] = useState('');
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const office = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setOfficeId(event.currentTarget.value);
    setRemoved('');
    setReplacement('');
  }, []);
  const choose = useCallback((value: SelectedPlayer[]): void => {
    setSelected(value.slice(0, 1));
  }, []);
  const remove = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setRemoved(event.currentTarget.value);
  }, []);
  const replace = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setReplacement(event.currentTarget.value);
  }, []);
  const appoint = useCallback((): void => {
    const [person] = selected;
    if (person !== undefined) {
      propose({
        kind: 'APPOINT_OFFICE_HOLDER',
        officeId,
        userId: person.id,
        replacedUserId: replacement === '' ? null : replacement,
      });
    }
  }, [selected, officeId, replacement, propose]);
  const dismiss = useCallback((): void => {
    propose({ kind: 'REMOVE_OFFICE_HOLDER', officeId, userId: removed });
  }, [officeId, removed, propose]);
  return (
    <ActionPanel title={uiText(locale, 'Назначения и освобождения', 'Appointments and removals')}>
      <FormField htmlFor={`${id}-office`} label={uiText(locale, 'Должность', 'Corporate office')}>
        <Select id={`${id}-office`} value={officeId} onChange={office}>
          <option value="">{uiText(locale, 'Выберите должность', 'Choose an office')}</option>
          {workspace.content.charter.offices.map((item) => (
            <option key={item.id} value={item.id}>
              {displayText(item.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      {workspace.availableActions.includes('APPOINT_OFFICE_HOLDER') && (
        <>
          <PlayerPicker
            label={uiText(locale, 'Назначаемый игрок', 'Appointee')}
            players={selected}
            onChange={choose}
          />
          <FormField
            htmlFor={`${id}-replacement`}
            label={uiText(
              locale,
              'Заменить должностное лицо (необязательно)',
              'Replace current holder (optional)',
            )}
          >
            <Select id={`${id}-replacement`} value={replacement} onChange={replace}>
              <option value="">{uiText(locale, 'Без замены', 'No replacement')}</option>
              {workspace.holders
                .filter((holder) => holder.officeId === officeId)
                .map((holder) => (
                  <option key={holder.id} value={holder.userId}>
                    {players.find((player) => player.id === holder.userId)?.name ??
                      uiText(locale, 'Участник недоступен', 'Participant unavailable')}
                  </option>
                ))}
            </Select>
          </FormField>
          <Button onClick={appoint} disabled={officeId === '' || selected.length !== 1}>
            {uiText(locale, 'Проверить назначение', 'Review appointment')}
          </Button>
        </>
      )}
      {workspace.availableActions.includes('REMOVE_OFFICE_HOLDER') && (
        <>
          <FormField
            htmlFor={`${id}-remove`}
            label={uiText(locale, 'Освободить от должности', 'Current holder to remove')}
          >
            <Select id={`${id}-remove`} value={removed} onChange={remove}>
              <option value="">
                {uiText(locale, 'Выберите действующее назначение', 'Choose a current appointment')}
              </option>
              {workspace.holders
                .filter((holder) => holder.officeId === officeId)
                .map((holder) => (
                  <option key={holder.id} value={holder.userId}>
                    {players.find((player) => player.id === holder.userId)?.name ??
                      uiText(locale, 'Участник недоступен', 'Participant unavailable')}
                  </option>
                ))}
            </Select>
          </FormField>
          <Button onClick={dismiss} disabled={officeId === '' || removed === ''}>
            {uiText(locale, 'Проверить освобождение', 'Review removal')}
          </Button>
        </>
      )}
      <Alert>
        {uiText(
          locale,
          'Назначение и освобождение также подчиняются отдельным правилам выбранной должности. Повторное назначение не восстанавливает старые подписи.',
          'Appointment and removal also follow the selected office’s own procedures. Reappointment never restores old signatures.',
        )}
      </Alert>
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </ActionPanel>
  );
}
export { CompanyOfficeAppointment };
