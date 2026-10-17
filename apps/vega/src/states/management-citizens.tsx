import { useCallback, useId, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { StateCitizens } from './citizens';
import { uiText } from './text';
import styles from './management.module.scss';

function ManagementCitizens({ state }: Readonly<{ state: StateDetail }>): ReactElement {
  const { locale } = useTranslation();
  const [search, setSearch] = useState('');
  const id = useId();
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
  }, []);
  const citizens = useMemo(
    () =>
      state.citizens.filter((citizen) =>
        citizen.name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)),
      ),
    [state.citizens, search, locale],
  );
  return (
    <section className={styles.card}>
      <h2>
        {uiText(locale, 'Граждане государства', 'State citizens')} · {state.citizens.length}
      </h2>
      <label htmlFor={id}>{uiText(locale, 'Найти гражданина', 'Find a citizen')}</label>
      <TextField id={id} type="search" value={search} onChange={change} />
      {citizens.length === 0 ? (
        <p>{uiText(locale, 'Граждане не найдены.', 'No citizens found.')}</p>
      ) : (
        <StateCitizens citizens={citizens} />
      )}
    </section>
  );
}
export { ManagementCitizens };
