import { z } from 'zod';
import type { CompanyDecisionPayload } from '@helicraft/alhena';
import { FormModel } from '@helicraft/atria';
import type { Locale } from '../locales';
import { uiText } from '../states/text';

const MAX_CATEGORY_LENGTH = 80;
const MAX_CATEGORIES = 20;

type CompanyProfileInput = Extract<CompanyDecisionPayload, { kind: 'UPDATE_PROFILE' }>;
function companyProfileForm(
  initial: CompanyProfileInput,
  locale: Locale,
): FormModel<CompanyProfileInput> {
  const localized = z.record(z.string(), z.string().optional());
  return new FormModel({
    defaultValues: initial,
    schema: z.object({
      name: localized.refine(
        (value) => Object.values(value).some((text) => text !== undefined && text.trim() !== ''),
        uiText(locale, 'Укажите название компании.', 'Enter a company name.'),
      ),
      description: localized,
      categories: z.array(z.string().trim().min(1).max(MAX_CATEGORY_LENGTH)).max(MAX_CATEGORIES),
    }),
    fields: [
      {
        kind: 'localized',
        name: 'name',
        label: uiText(locale, 'Название компании', 'Company name'),
      },
      {
        kind: 'localized-multiline',
        name: 'description',
        label: uiText(locale, 'Описание компании', 'Company description'),
      },
    ],
  });
}
export { companyProfileForm };
