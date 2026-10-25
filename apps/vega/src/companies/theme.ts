import type { CSSProperties } from 'react';
import type { CompanyBranding } from '@helicraft/alhena';

function companyTheme(branding?: CompanyBranding): CSSProperties & { '--company-accent': string } {
  return { '--company-accent': branding?.color ?? '#607d8b' };
}
export { companyTheme };
