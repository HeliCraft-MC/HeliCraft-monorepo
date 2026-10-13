// oxlint-disable no-magic-numbers -- These bounds are the shared user-content contract limits.
import { z } from '@hono/zod-openapi';

const SUPPORTED_LOCALES = ['ru', 'en'] as const;
const LocaleSchema = z.enum(SUPPORTED_LOCALES);
const LocalizedInputSchema = z
  .partialRecord(LocaleSchema, z.string().max(100_000))
  .openapi('LocalizedInput');
const ResolvedTextSchema = z
  .object({ value: z.string(), resolvedLocale: LocaleSchema.nullable() })
  .openapi('ResolvedText');
type LocalizedInput = z.infer<typeof LocalizedInputSchema>;
type Locale = z.infer<typeof LocaleSchema>;
function resolveText(
  values: Readonly<LocalizedInput>,
  requested: Locale,
): z.infer<typeof ResolvedTextSchema> {
  for (const locale of new Set([requested, 'en', ...SUPPORTED_LOCALES])) {
    const parsed = LocaleSchema.parse(locale);
    const value = values[parsed];
    if (value !== undefined && value.trim() !== '') {
      return { value, resolvedLocale: parsed };
    }
  }
  return { value: '', resolvedLocale: null };
}
export {
  SUPPORTED_LOCALES,
  LocaleSchema,
  LocalizedInputSchema,
  ResolvedTextSchema,
  resolveText,
  type LocalizedInput,
  type Locale,
};
