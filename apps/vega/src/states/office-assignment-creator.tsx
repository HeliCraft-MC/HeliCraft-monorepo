import { useState, useId, useCallback } from 'react';
import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOfficeAssignment } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, Button, FormField, Select } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import styles from './states.module.scss';

function OfficeAssignmentCreator({ state }: Readonly<{ state: StateDetail }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const [officeId, setOfficeId] = useState(state.configuration.governance.offices[0]?.id ?? '');
  const [kind, setKind] = useState<'APPOINT' | 'REMOVE'>('APPOINT');
  const [userId, setUserId] = useState('');
  const [replacedUserId, setReplacedUserId] = useState('');
  const holders = state.holders.filter((holder) => holder.officeId === officeId);
  const people =
    kind === 'APPOINT'
      ? state.citizens
      : holders.map((holder) => ({ id: holder.userId, name: holder.name }));
  const proposal = useMutation({
    mutationFn: async () => {
      await createOfficeAssignment({
        client: browserClient(),
        path: { stateId: state.id },
        body: {
          officeId,
          kind,
          userId,
          replacedUserId: kind === 'APPOINT' && replacedUserId !== '' ? replacedUserId : null,
        },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['office-assignments', state.id] });
      setUserId('');
      setReplacedUserId('');
    },
  });
  const changeOffice = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setOfficeId(event.currentTarget.value);
    setUserId('');
    setReplacedUserId('');
  }, []);
  const changeKind = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.currentTarget;
    if (value === 'APPOINT' || value === 'REMOVE') {
      setKind(value);
      setUserId('');
      setReplacedUserId('');
    }
  }, []);
  const changePerson = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setUserId(event.currentTarget.value);
  }, []);
  const changeReplacement = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setReplacedUserId(event.currentTarget.value);
  }, []);
  const { mutate } = proposal;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      mutate();
    },
    [mutate],
  );
  return (
    <form className={styles.card} onSubmit={submit}>
      <h3>{uiText(locale, 'Новое предложение о должности', 'New office proposal')}</h3>
      <p>
        {uiText(
          locale,
          'Предложение не меняет назначения сразу. Оно фиксирует действующие правила и открывает необходимые голосования; одобрения должностных лиц и ручная проверка собираются отдельно.',
          'A proposal does not immediately change holders. It pins current rules and opens the required votes; office approvals and manual review are collected separately.',
        )}
      </p>
      <FormField htmlFor={`${id}-office`} label={uiText(locale, 'Должность', 'Office')}>
        <Select id={`${id}-office`} value={officeId} onChange={changeOffice} required>
          {state.configuration.governance.offices.map((office) => (
            <option key={office.id} value={office.id}>
              {displayText(office.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        htmlFor={`${id}-kind`}
        label={uiText(locale, 'Действие с должностью', 'Office action')}
      >
        <Select id={`${id}-kind`} value={kind} onChange={changeKind}>
          <option value="APPOINT">{uiText(locale, 'Назначить', 'Appoint')}</option>
          <option value="REMOVE">{uiText(locale, 'Снять с должности', 'Remove holder')}</option>
        </Select>
      </FormField>
      <FormField
        htmlFor={`${id}-person`}
        label={uiText(locale, 'Игрок для решения', 'Player for this decision')}
      >
        <Select id={`${id}-person`} value={userId} onChange={changePerson} required>
          <option value="">{uiText(locale, 'Выберите игрока', 'Choose a player')}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </FormField>
      {kind === 'APPOINT' && (
        <FormField
          htmlFor={`${id}-replacement`}
          label={uiText(locale, 'Кого заменить', 'Holder to replace')}
          help={uiText(
            locale,
            'Для свободного места оставьте «Не заменять». Если мест нет, выберите нынешнего держателя. Замена завершает его полномочия и начинает полномочия нового игрока только после принятия решения.',
            'Leave no replacement for a free seat. If all seats are occupied, choose the current holder. Replacement ends their authority and begins the new holder’s authority only after adoption.',
          )}
        >
          <Select id={`${id}-replacement`} value={replacedUserId} onChange={changeReplacement}>
            <option value="">
              {uiText(locale, 'Не заменять — свободное место', 'No replacement — free seat')}
            </option>
            {holders.map((holder) => (
              <option key={holder.userId} value={holder.userId}>
                {holder.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={proposal.isPending || userId === '' || officeId === ''}>
          {uiText(locale, 'Инициировать решение', 'Initiate decision')}
        </Button>
      </div>
      {proposal.error !== null && <Alert tone="danger">{errorMessage(proposal.error)}</Alert>}
    </form>
  );
}
export { OfficeAssignmentCreator };
