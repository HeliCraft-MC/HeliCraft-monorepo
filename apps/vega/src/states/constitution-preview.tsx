import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Alert } from '@helicraft/atria';
import { LocaleContext } from '../locale-context';
import type { Locale } from '../locales';
import { errorMessage } from '../account-api';
import { ConstitutionDocument } from './constitution';
import type { useConstitutionPreview } from './use-constitution-preview';
import { uiText } from './text';
import styles from './constitution-editor.module.scss';

function ConstitutionPreview({
  preview,
  locale,
}: Readonly<{ preview: ReturnType<typeof useConstitutionPreview>; locale: Locale }>): ReactElement {
  const context = useMemo(
    () => ({
      locale,
      setLocale: (): void => {
        /* Preview language is controlled by its document editor. */
      },
    }),
    [locale],
  );
  let content: ReactElement = (
    <output>{uiText(locale, 'Подготовка предпросмотра…', 'Preparing preview…')}</output>
  );
  if (preview.error !== null) {
    content = <Alert tone="danger">{errorMessage(preview.error)}</Alert>;
  } else if (!preview.pending) {
    content = (
      <LocaleContext.Provider value={context}>
        <ConstitutionDocument configuration={preview.configuration} html={preview.html} />
      </LocaleContext.Provider>
    );
  }
  return (
    <div className={styles.paper}>
      {content}
      {preview.warnings.length > 0 && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Неизвестные или удалённые подстановки:',
            'Unknown or removed placeholders:',
          )}{' '}
          {preview.warnings.join(', ')}
        </Alert>
      )}
    </div>
  );
}
export { ConstitutionPreview };
