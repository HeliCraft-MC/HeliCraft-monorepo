// oxlint-disable no-magic-numbers -- Survey contract limits bound request size and editor controls.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const SurveyBlockSchema = z
  .object({
    id: z.uuid(),
    type: z.enum([
      'SHORT_TEXT',
      'PARAGRAPH',
      'SINGLE_CHOICE',
      'CHECKBOX',
      'DROPDOWN',
      'TEXT_BLOCK',
      'IMAGE_BLOCK',
    ]),
    title: LocalizedInputSchema,
    description: LocalizedInputSchema,
    required: z.boolean(),
    optionIds: z.array(z.uuid()).max(50),
    maxSelections: z.number().int().min(1).max(50),
    minLength: z.number().int().min(0).max(10_000),
    maxLength: z.number().int().min(1).max(10_000),
    content: LocalizedInputSchema,
    style: z.enum(['NORMAL', 'INFO', 'WARNING', 'SUCCESS']),
    images: z.array(z.object({ id: z.uuid(), caption: LocalizedInputSchema })).max(10),
    displayMode: z.enum(['GRID', 'CAROUSEL', 'RANDOM', 'VERTICAL']),
    showCaptions: z.boolean(),
  })
  .openapi('SurveyBlock');
const SurveySchema = z
  .object({
    blocks: z.array(SurveyBlockSchema).max(100),
    oneResponsePerUser: z.boolean(),
    manualClose: z.boolean().optional(),
  })
  .openapi('Survey');
const SurveyAnswerSchema = z
  .object({
    questionId: z.uuid(),
    value: z.union([z.string().max(10_000), z.array(z.uuid()).max(50)]),
  })
  .openapi('SurveyAnswer');
const SurveySummarySchema = z
  .object({
    questionId: z.uuid(),
    answered: z.number(),
    options: z.array(z.object({ id: z.uuid(), count: z.number() })),
  })
  .openapi('SurveySummary');
const SurveyResponseSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    username: z.string(),
    castAt: z.iso.datetime(),
    answers: z.array(SurveyAnswerSchema),
  })
  .openapi('SurveyResponse');
const SurveyResponsesSchema = z
  .object({ items: z.array(SurveyResponseSchema), total: z.number() })
  .openapi('SurveyResponses');
type Survey = z.infer<typeof SurveySchema>;
type SurveyBlock = z.infer<typeof SurveyBlockSchema>;
type SurveyAnswer = z.infer<typeof SurveyAnswerSchema>;
type SurveySummary = z.infer<typeof SurveySummarySchema>;
export {
  SurveySchema,
  SurveyAnswerSchema,
  SurveyResponsesSchema,
  SurveySummarySchema,
  type Survey,
  type SurveyBlock,
  type SurveyAnswer,
  type SurveySummary,
};
