import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { FormField, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { localDateTime, isoDateTime } from './time';
import { uiText } from './text';
import styles from './states.module.scss';

const HOUR_MS = 3_600_000;
function PollSchedule({
  input,
  onChange,
}: Readonly<{ input: VotingInput; onChange: (input: VotingInput) => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const open = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const opensAt = isoDateTime(event.currentTarget.value);
      const closesAt =
        input.survey?.manualClose === true && Date.parse(input.closesAt) <= Date.parse(opensAt)
          ? new Date(Date.parse(opensAt) + HOUR_MS).toISOString()
          : input.closesAt;
      onChange({ ...input, opensAt, closesAt });
    },
    [input, onChange],
  );
  const close = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...input, closesAt: isoDateTime(event.currentTarget.value) });
    },
    [input, onChange],
  );
  return (
    <div className={styles.grid}>
      <FormField
        htmlFor={`${id}-open`}
        label={uiText(locale, 'Начало голосования', 'Voting opens at')}
      >
        <TextField
          id={`${id}-open`}
          type="datetime-local"
          value={localDateTime(input.opensAt)}
          onChange={open}
        />
      </FormField>
      {input.survey?.manualClose !== true && (
        <FormField
          htmlFor={`${id}-close`}
          label={uiText(locale, 'Завершение голосования', 'Voting closes at')}
        >
          <TextField
            id={`${id}-close`}
            type="datetime-local"
            value={localDateTime(input.closesAt)}
            onChange={close}
          />
        </FormField>
      )}
    </div>
  );
}
export { PollSchedule };
