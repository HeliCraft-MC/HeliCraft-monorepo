import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const TaxCategorySchema = z
  .object({ code: z.string(), name: LocalizedInputSchema, description: LocalizedInputSchema })
  .strict()
  .openapi('TaxCategory');
type TaxCategory = z.infer<typeof TaxCategorySchema>;
const TAX_CATEGORIES: readonly TaxCategory[] = [
  {
    code: 'TRANSFER',
    name: { en: 'General money transfers', ru: 'Общие денежные переводы' },
    description: {
      en: 'A shared platform category for ordinary official transfers; it does not classify a transfer as a purchase.',
      ru: 'Общая категория платформы для обычных официальных переводов; не объявляет перевод покупкой.',
    },
  },
  {
    code: 'INCOME',
    name: { en: 'Transfer receipts', ru: 'Поступления от переводов' },
    description: {
      en: 'A distinct legal category for receipts from supported transfers. The law still determines the taxpayer and event.',
      ru: 'Отдельная юридическая категория поступлений от поддерживаемых переводов. Плательщика и событие определяет закон.',
    },
  },
  {
    code: 'CONTRIBUTION',
    name: { en: 'Transfer contributions', ru: 'Взносы с переводов' },
    description: {
      en: 'Independent public contributions assessed on supported official transfers.',
      ru: 'Самостоятельные публичные взносы с поддерживаемых официальных переводов.',
    },
  },
];
function registeredTaxCategory(code: string): boolean {
  return TAX_CATEGORIES.some((category) => category.code === code);
}
export { TAX_CATEGORIES, TaxCategorySchema, registeredTaxCategory };
