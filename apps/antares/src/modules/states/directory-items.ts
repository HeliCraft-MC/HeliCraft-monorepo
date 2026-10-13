import { and, eq, inArray } from 'drizzle-orm';
import { stateRevisionTexts, localizedTextValues } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { LocalizedInputSchema } from '../localized-content/contracts';
import type { StateConfiguration } from './contracts';
import type { StateDirectory } from './directory-contracts';

interface DirectoryRecord {
  readonly id: string;
  readonly slug: string;
  readonly createdAt: Date;
  readonly revisionId: string;
  readonly configuration: StateConfiguration;
  readonly citizens: number;
}
function summaries(
  records: readonly DirectoryRecord[],
  translations: readonly { revisionId: string; path: string; locale: string; value: string }[],
): StateDirectory['items'] {
  return records.map((record) => {
    function textValues(path: string): ReturnType<typeof LocalizedInputSchema.parse> {
      return LocalizedInputSchema.parse(
        Object.fromEntries(
          translations
            .filter(
              (translation) =>
                translation.revisionId === record.revisionId && translation.path === path,
            )
            .map((translation) => [translation.locale, translation.value]),
        ),
      );
    }
    return {
      id: record.id,
      slug: record.slug,
      name: textValues('name'),
      description: textValues('description'),
      color: record.configuration.color,
      horizontalFlag: record.configuration.horizontalFlag,
      citizenship: record.configuration.citizenship,
      citizens: record.citizens,
      officeCount: record.configuration.governance.offices.length,
      hasConstitution: record.configuration.constitution !== null,
      createdAt: record.createdAt.toISOString(),
    };
  });
}
async function directoryItems(
  transaction: Transaction,
  records: readonly DirectoryRecord[],
): Promise<StateDirectory['items']> {
  const translations =
    records.length === 0
      ? []
      : await transaction
          .select({
            revisionId: stateRevisionTexts.revisionId,
            path: stateRevisionTexts.path,
            locale: localizedTextValues.locale,
            value: localizedTextValues.value,
          })
          .from(stateRevisionTexts)
          .innerJoin(localizedTextValues, eq(localizedTextValues.textId, stateRevisionTexts.textId))
          .where(
            and(
              inArray(
                stateRevisionTexts.revisionId,
                records.map((record) => record.revisionId),
              ),
              inArray(stateRevisionTexts.path, ['name', 'description']),
            ),
          );
  return summaries(records, translations);
}
export { directoryItems };
