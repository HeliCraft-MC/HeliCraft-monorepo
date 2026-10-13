import { eq } from 'drizzle-orm';
import { localizedTexts, localizedTextValues } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { LocalizedInputSchema, SUPPORTED_LOCALES } from './contracts';
import type { LocalizedInput } from './contracts';

async function createText(
  transaction: Transaction,
  values: Readonly<LocalizedInput>,
): Promise<string> {
  const input = LocalizedInputSchema.parse(values);
  const id = crypto.randomUUID();
  await transaction.insert(localizedTexts).values({ id });
  const rows = SUPPORTED_LOCALES.flatMap((locale) => {
    const value = input[locale];
    return value === undefined ? [] : [{ textId: id, locale, value }];
  });
  if (rows.length > 0) {
    await transaction.insert(localizedTextValues).values(rows);
  }
  return id;
}
async function readText(transaction: Transaction, textId: string): Promise<LocalizedInput> {
  const rows = await transaction
    .select()
    .from(localizedTextValues)
    .where(eq(localizedTextValues.textId, textId));
  return LocalizedInputSchema.parse(Object.fromEntries(rows.map((row) => [row.locale, row.value])));
}
export { createText, readText };
