import { useCallback, useMemo, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerSpatialWorld } from '@helicraft/alhena';
import type { LocalizedInput, SpatialWorld } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { LocalizedForm } from '../localized-form';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { WorldStatus } from './world-status';
import styles from './spatial.module.scss';

function fieldText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function WorldRegistration({
  onSaved,
  worlds,
}: Readonly<{ onSaved: () => void; worlds?: readonly SpatialWorld[] }>): ReactElement {
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
          logicalKey: fieldText(data, 'logicalKey'),
          backendId: fieldText(data, 'backendId'),
          paperWorldId: fieldText(data, 'paperWorldId'),
          dimension: 'minecraft:overworld',
          tileKey: fieldText(data, 'tileKey'),
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
    <section>
      <WorldStatus worlds={worlds} />
      <details>
        <summary>
          {uiText(locale, 'Ручная регистрация (дополнительно)', 'Manual registration (advanced)')}
        </summary>
        <p>
          {uiText(
            locale,
            'Эта форма нужна только для нестандартной настройки. Найдите в журнале Денеба строку «Spatial Paper world <UUID> dimension minecraft:overworld». Скопируйте UUID в поле Paper world UUID. Измерение здесь уже выбрано: обычный мир. Не используйте UUID аккаунта игрока.',
            'Use this form only for a custom setup. Find “Spatial Paper world <UUID> dimension minecraft:overworld” in Deneb logs. Copy that UUID into Paper world UUID. This form already selects the Overworld dimension. Do not use a player account UUID.',
          )}
        </p>
        <form className={styles.panel} onSubmit={submit}>
          <LocalizedForm fields={fields} />
          <FormField
            label="Logical key"
            htmlFor="spatial-logical"
            hint={uiText(
              locale,
              'Уникальный постоянный идентификатор, например main-world. Только строчные латинские буквы, цифры и дефис.',
              'A unique permanent identifier, for example main-world. Use lowercase ASCII letters, digits and hyphens.',
            )}
          >
            <TextField
              id="spatial-logical"
              name="logicalKey"
              required
              pattern="[a-z0-9][a-z0-9-]{0,63}"
            />
          </FormField>
          <FormField
            label="Backend ID"
            htmlFor="spatial-backend"
            hint={uiText(
              locale,
              'Для стандартного стенда оставьте deneb. На другом сервере укажите backendId сервисной учётной записи Денеба.',
              'Keep deneb for the standard stack. Other servers must use the backendId assigned to their Deneb service account.',
            )}
          >
            <TextField id="spatial-backend" name="backendId" defaultValue="deneb" required />
          </FormField>
          <FormField
            label="Paper world UUID"
            htmlFor="spatial-paper"
            hint={uiText(
              locale,
              'UUID именно этого мира из журнала Денеба; это не ник, не имя папки и не UUID игрока.',
              'The UUID of this exact world from Deneb logs, not a username, folder name or player UUID.',
            )}
          >
            <TextField id="spatial-paper" name="paperWorldId" required />
          </FormField>
          <FormField
            label="squaremap tile key"
            htmlFor="spatial-tiles"
            hint={uiText(
              locale,
              'Для обычного мира стандартного стенда оставьте minecraft_overworld. Этот ключ определяет папку тайлов карты.',
              'Keep minecraft_overworld for the default primary world. This key identifies the map tile directory.',
            )}
          >
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
    </section>
  );
}
export { WorldRegistration };
