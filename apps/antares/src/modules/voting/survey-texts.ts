import { eq } from 'drizzle-orm';
import { votingSurveyTexts } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { LocalizedInput } from '../localized-content/contracts';
import { createText, readText } from '../localized-content/service';
import type { Survey } from './survey-contracts';

type TextMapper = (key: string, value: LocalizedInput) => Promise<LocalizedInput>;
async function mapSurvey(survey: Survey, map: TextMapper): Promise<Survey> {
  return {
    ...survey,
    blocks: await Promise.all(
      survey.blocks.map(async (block) => ({
        ...block,
        title: await map(`${block.id}:title`, block.title),
        description: await map(`${block.id}:description`, block.description),
        content: await map(`${block.id}:content`, block.content),
        images: await Promise.all(
          block.images.map(async (image) => ({
            ...image,
            caption: await map(`${block.id}:image:${image.id}`, image.caption),
          })),
        ),
      })),
    ),
  };
}
async function storeSurvey(
  transaction: Transaction,
  id: string,
  survey: Survey | undefined,
): Promise<Survey | undefined> {
  if (!survey) {
    return undefined;
  }
  return await mapSurvey(survey, async (key, value) => {
    await transaction
      .insert(votingSurveyTexts)
      .values({ votingId: id, key, textId: await createText(transaction, value) });
    return {};
  });
}
async function readSurvey(
  transaction: Transaction,
  id: string,
  survey: Survey | undefined,
): Promise<Survey | undefined> {
  if (!survey) {
    return undefined;
  }
  const rows = await transaction
    .select()
    .from(votingSurveyTexts)
    .where(eq(votingSurveyTexts.votingId, id));
  return await mapSurvey(survey, async (key) => {
    const row = rows.find((item) => item.key === key);
    if (!row) {
      throw new Error('Survey text missing');
    }
    return await readText(transaction, row.textId);
  });
}
export { storeSurvey, readSurvey };
