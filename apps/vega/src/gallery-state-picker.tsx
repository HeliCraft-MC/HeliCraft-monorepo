import { galleryStateRole } from './gallery-state-labels';
import { useId, useState, useCallback, useMemo } from 'react';
import type { ChangeEvent, ComponentProps, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listStates } from '@helicraft/alhena';
import { Alert, Button, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { displayText, uiText } from './states/text';
import { usePropCache, rowKey } from './states/use-prop-cache';
import styles from './gallery.module.scss';

interface SelectedGalleryState {
  readonly stateId: string;
  readonly role: 'LOCATION' | 'PARTICIPANT' | 'RELATED';
  readonly name: string;
}
const MAX_LINKS = 20;
function GalleryStatePicker({
  value,
  onChange,
  disabled,
}: Readonly<{
  value: SelectedGalleryState[];
  onChange: (value: SelectedGalleryState[]) => void;
  disabled: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<SelectedGalleryState['role']>('LOCATION');
  const states = useQuery({
    queryKey: ['gallery-state-search', search],
    queryFn: async () => {
      const result = await listStates({
        client: createClient({ credentials: 'omit' }),
        query: { search, pageSize: MAX_LINKS },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const changeSearch = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
  }, []);
  const changeRole = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.currentTarget.value;
    if (next === 'LOCATION' || next === 'PARTICIPANT' || next === 'RELATED') {
      setRole(next);
    }
  }, []);
  const scope = useMemo(() => [value, onChange, role, locale], [value, onChange, role, locale]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  return (
    <fieldset className={styles.statePicker} disabled={disabled}>
      <legend>{uiText(locale, 'Связанные государства', 'Related states')}</legend>
      <FormField
        htmlFor={`${id}-role`}
        label={uiText(locale, 'Связь со снимком', 'Relationship to photo')}
        help={uiText(
          locale,
          'Укажите место съёмки, государство-участника события или другую связь. Один снимок можно связать с несколькими государствами.',
          'Choose the shooting location, a state participating in the event, or another relationship. One photo can be linked to multiple states.',
        )}
      >
        <Select id={`${id}-role`} value={role} onChange={changeRole}>
          <option value="LOCATION">{uiText(locale, 'Место съёмки', 'Photo location')}</option>
          <option value="PARTICIPANT">{uiText(locale, 'Участник', 'Participant')}</option>
          <option value="RELATED">{uiText(locale, 'Другая связь', 'Other relationship')}</option>
        </Select>
      </FormField>
      <FormField
        htmlFor={`${id}-search`}
        label={uiText(locale, 'Найти государство', 'Find a state')}
      >
        <TextField id={`${id}-search`} value={search} onChange={changeSearch} />
      </FormField>
      <ul className={styles.playerChips}>
        {value.map((state) => (
          <li key={`${state.stateId}:${state.role}`}>
            <span>
              {state.name} · {galleryStateRole(state.role, locale)}
            </span>
            <Button
              tone="quiet"
              onClick={click(rowKey('remove', state), () => {
                onChange(value.filter((item) => item !== state));
              })}
            >
              {uiText(locale, 'Удалить', 'Remove')}
            </Button>
          </li>
        ))}
      </ul>
      {states.isPending && <output>{uiText(locale, 'Поиск…', 'Searching…')}</output>}
      {states.isError && (
        <Alert tone="danger">
          {uiText(locale, 'Не удалось загрузить государства.', 'Could not load states.')}
        </Alert>
      )}
      <ul className={styles.playerResults}>
        {(states.data ?? []).map((state) => (
          <li key={state.id}>
            <Button
              tone="quiet"
              disabled={
                value.length >= MAX_LINKS ||
                value.some((item) => item.stateId === state.id && item.role === role)
              }
              onClick={click(rowKey('add', state.id), () => {
                onChange([
                  ...value,
                  { stateId: state.id, role, name: displayText(state.name, locale) || state.slug },
                ]);
              })}
            >
              {displayText(state.name, locale) || state.slug}
            </Button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
export { GalleryStatePicker, type SelectedGalleryState };
