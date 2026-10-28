import type { ReactElement, SubmitEvent } from 'react';
import type { FlatPoint } from '@helicraft/atria';
import { Button, FormField, TextField } from '@helicraft/atria';
import { LocateFixed } from 'lucide-react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './territory-editor.module.scss';

function TerritoryCoordinates({
  center,
  onSubmit,
}: Readonly<{
  center: FlatPoint;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <details className={styles.details}>
      <summary>
        {uiText(locale, 'Перейти к месту по координатам', 'Find a place by coordinates')}
      </summary>
      <form className={styles.coordinates} onSubmit={onSubmit}>
        <FormField label="X" htmlFor="territory-x">
          <TextField
            id="territory-x"
            name="x"
            type="number"
            step="any"
            defaultValue={center[0]}
            required
          />
        </FormField>
        <FormField label="Z" htmlFor="territory-z">
          <TextField
            id="territory-z"
            name="z"
            type="number"
            step="any"
            defaultValue={center[1]}
            required
          />
        </FormField>
        <Button type="submit" tone="quiet">
          <LocateFixed aria-hidden="true" />
          {uiText(locale, 'Перейти к координатам', 'Go to coordinates')}
        </Button>
      </form>
    </details>
  );
}
export { TerritoryCoordinates };
