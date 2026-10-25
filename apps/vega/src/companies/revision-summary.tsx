import type { ReactElement } from 'react';
import type { CompanyRevisionContent } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { CompanyAppearancePreview } from './appearance-preview';
import { CompanyCharterSummary } from './charter-summary';

function CompanyRevisionSummary({
  content,
  companyId,
  decisionId,
}: Readonly<{
  content: CompanyRevisionContent;
  companyId?: string;
  decisionId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h3>{displayText(content.name, locale)}</h3>
      <p>{displayText(content.description, locale)}</p>
      <p>{content.categories.join(', ')}</p>
      <CompanyAppearancePreview
        companyId={companyId}
        decisionId={decisionId}
        branding={content.branding}
      />
      <CompanyCharterSummary charter={content.charter} />
      <pre>{displayText(content.document, locale)}</pre>
    </section>
  );
}
export { CompanyRevisionSummary };
