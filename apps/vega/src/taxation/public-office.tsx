import type { ReactElement } from 'react';
import type { PublicTaxation } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

import { PublicLaw } from './public-law';

function PublicTaxationPage({ item }: Readonly<{ item: PublicTaxation }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h1>{displayText(item.office.name, locale)}</h1>
      <p>{displayText(item.office.description, locale)}</p>
      <h2>{uiText(locale, 'Действующие налоговые законы', 'Current tax laws')}</h2>
      {item.laws.length === 0 && (
        <p>{uiText(locale, 'Действующих законов нет.', 'No current laws.')}</p>
      )}
      {item.laws.map((law) => (
        <PublicLaw key={law.id} revision={law} />
      ))}
      <a href="/treaties">{uiText(locale, 'Международные договоры', 'International treaties')}</a>
    </section>
  );
}
export { PublicTaxationPage };
