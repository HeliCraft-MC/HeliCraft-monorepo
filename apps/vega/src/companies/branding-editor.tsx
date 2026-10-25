import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyBranding } from '@helicraft/alhena';
import { FormField, FormSection, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyImageField } from './image-field';
import styles from './companies.module.scss';

const DEFAULT_COMPANY_BRANDING: CompanyBranding = {
  color: '#607d8b',
  logoMediaId: null,
  coverMediaId: null,
};
function CompanyBrandingEditor({
  companyId,
  value = DEFAULT_COMPANY_BRANDING,
  onChange,
}: Readonly<{
  companyId: string;
  value?: CompanyBranding;
  onChange: (branding: CompanyBranding) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const color = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, color: event.currentTarget.value });
    },
    [value, onChange],
  );
  const logo = useCallback(
    (logoMediaId: string | null): void => {
      onChange({ ...value, logoMediaId });
    },
    [value, onChange],
  );
  const cover = useCallback(
    (coverMediaId: string | null): void => {
      onChange({ ...value, coverMediaId });
    },
    [value, onChange],
  );
  return (
    <FormSection
      title={uiText(locale, 'Оформление компании', 'Company appearance')}
      description={uiText(
        locale,
        'Логотип, обложка и цвет появятся на публичной странице после утверждения сведений.',
        'The logo, cover and accent color appear publicly after the profile is approved.',
      )}
    >
      <FormField htmlFor={id} label={uiText(locale, 'Цвет компании', 'Company color')}>
        <TextField id={id} type="color" value={value.color} onChange={color} />
      </FormField>
      <div className={styles.brandingGrid}>
        <CompanyImageField
          companyId={companyId}
          kind="LOGO"
          mediaId={value.logoMediaId}
          onChange={logo}
        />
        <CompanyImageField
          companyId={companyId}
          kind="COVER"
          mediaId={value.coverMediaId}
          onChange={cover}
        />
      </div>
    </FormSection>
  );
}
export { CompanyBrandingEditor };
