import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { CompanyBranding } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './companies.module.scss';

function CompanyAppearancePreview({
  companyId,
  branding,
  decisionId,
  applicationId,
}: Readonly<{
  companyId?: string;
  branding?: CompanyBranding;
  decisionId?: string;
  applicationId?: string;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const swatch = useMemo<CSSProperties>(
    () => ({ backgroundColor: branding?.color }),
    [branding?.color],
  );
  let base = companyId === undefined ? undefined : `/api/v1/account/companies/${companyId}/media`;
  if (decisionId !== undefined) {
    base = `/api/v1/account/company-decisions/${decisionId}/media`;
  }
  if (applicationId !== undefined) {
    base = `/api/v1/account/company-applications/${applicationId}/media`;
  }
  if (branding === undefined) {
    return null;
  }
  return (
    <section aria-label={uiText(locale, 'Оформление компании', 'Company appearance')}>
      <p>
        <span className={styles.colorSwatch} style={swatch} aria-hidden="true" />{' '}
        {uiText(locale, 'Цвет компании', 'Company color')}: {branding.color}
      </p>
      {base !== undefined && branding.logoMediaId !== null ? (
        <img
          className={styles.logo}
          src={`${base}/${branding.logoMediaId}`}
          alt={uiText(locale, 'Логотип компании', 'Company logo')}
          width="96"
          height="96"
        />
      ) : (
        <p>{uiText(locale, 'Логотип не задан', 'No logo')}</p>
      )}
      {base !== undefined && branding.coverMediaId !== null ? (
        <img
          className={styles.cover}
          src={`${base}/${branding.coverMediaId}`}
          alt={uiText(locale, 'Обложка компании', 'Company cover')}
        />
      ) : (
        <p>{uiText(locale, 'Обложка не задана', 'No cover')}</p>
      )}
    </section>
  );
}
export { CompanyAppearancePreview };
