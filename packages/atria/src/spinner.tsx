import type { ReactElement } from 'react';
import styles from './primitives.module.scss';

function Spinner({ label = 'Загрузка' }: Readonly<{ label?: string }>): ReactElement {
  return (
    <output className={styles.spinner} aria-label={label}>
      <span aria-hidden="true">◌</span>
    </output>
  );
}

export { Spinner };
