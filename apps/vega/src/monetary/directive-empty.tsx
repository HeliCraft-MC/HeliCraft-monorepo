import type { ReactElement } from 'react';
import type { StateMonetary } from '@helicraft/alhena';
import { DirectiveResult } from './directive-result';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

function DirectiveEmpty({
  id,
  monetary,
}: Readonly<{ id: string | null; monetary: StateMonetary }>): ReactElement {
  const { text } = useTranslation();
  return (
    <section className={styles.panel}>
      <DirectiveResult id={id} monetary={monetary} />
      <p>{text('monetary.noAvailableActions')}</p>
    </section>
  );
}
export { DirectiveEmpty };
