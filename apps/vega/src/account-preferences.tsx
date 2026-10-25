import { PageHeader } from '@helicraft/atria';
import type { ReactElement } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { useTranslation } from './i18n';
import styles from './account.module.scss';

function AccountPreferences(): ReactElement {
  const { text } = useTranslation();
  return (
    <>
      <PageHeader title={text('account.preferences')} />
      <p className={styles.paragraph}>{text('settings.description')}</p>
      <section className={styles.section}>
        <h2>{text('settings.language')}</h2>
        <p className={styles.paragraph}>{text('settings.languageHint')}</p>
        <LanguageSwitcher />
      </section>
    </>
  );
}
export { AccountPreferences };
