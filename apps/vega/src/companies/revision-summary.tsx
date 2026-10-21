import type { ReactElement } from 'react';
import type { CompanyRevisionContent } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { CompanyCharterSummary } from './charter-summary';

function CompanyRevisionSummary({
  content,
}: Readonly<{ content: CompanyRevisionContent }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h3>{displayText(content.name, locale)}</h3>
      <p>{displayText(content.description, locale)}</p>
      <p>{content.categories.join(', ')}</p>
      <CompanyCharterSummary charter={content.charter} />
      <pre>{displayText(content.document, locale)}</pre>
    </section>
  );
}
export { CompanyRevisionSummary };
