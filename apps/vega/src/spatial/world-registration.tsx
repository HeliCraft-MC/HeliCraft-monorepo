import { useCallback, useMemo, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerSpatialWorld } from '@helicraft/alhena';
import type { LocalizedInput } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { LocalizedForm } from '../localized-form';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { formText } from '../monetary/model';
import styles from './spatial.module.scss';

function WorldRegistration({ onSaved }: Readonly<{ onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [name, setName] = useState<LocalizedInput>({});
  const fields = useMemo(
    () => [
      {
        name: 'name',
        label: uiText(locale, 'Название мира', 'World name'),
        value: name,
        onChange: setName,
      },
    ],
    [locale, name],
  );
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      await registerSpatialWorld({
        client: browserClient(),
        body: {
          logicalKey: formText(data, 'logicalKey'),
          backendId: formText(data, 'backendId'),
          paperWorldId: formText(data, 'paperWorldId'),
          dimension: 'minecraft:overworld',
          tileKey: formText(data, 'tileKey'),
          name,
        },
        throwOnError: true,
      });
    },
    onSuccess: onSaved,
  });
  const { mutate } = mutation;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      mutate(new FormData(event.currentTarget));
    },
    [mutate],
  );
  return (
    <details>
      <summary>{uiText(locale, 'Зарегистрировать мир', 'Register a world')}</summary>
      <p>
        {uiText(
          locale,
          'Возьмите UUID и dimension из журнала Денеба. Привязка неизменна: пересозданный мир требует новой регистрации. Новый мир не наследует старые границы.',
          'Read the UUID and dimension from Deneb logs. The binding is immutable: a recreated world needs a new registration. New worlds do not inherit previous boundaries.',
        )}
      </p>
      <form className={styles.panel} onSubmit={submit}>
        <LocalizedForm fields={fields} />
        <FormField label="Logical key" htmlFor="spatial-logical">
          <TextField
            id="spatial-logical"
            name="logicalKey"
            required
            pattern="[a-z0-9][a-z0-9-]{0,63}"
          />
        </FormField>
        <FormField label="Backend ID" htmlFor="spatial-backend">
          <TextField id="spatial-backend" name="backendId" defaultValue="deneb" required />
        </FormField>
        <FormField label="Paper world UUID" htmlFor="spatial-paper">
          <TextField id="spatial-paper" name="paperWorldId" required />
        </FormField>
        <FormField label="squaremap tile key" htmlFor="spatial-tiles">
          <TextField
            id="spatial-tiles"
            name="tileKey"
            defaultValue="minecraft_overworld"
            required
          />
        </FormField>
        <Button type="submit" disabled={mutation.isPending}>
          {uiText(locale, 'Зарегистрировать Overworld', 'Register Overworld')}
        </Button>
        {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </details>
  );
}
export { WorldRegistration };
