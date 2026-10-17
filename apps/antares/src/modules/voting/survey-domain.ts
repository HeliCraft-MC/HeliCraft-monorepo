import type { VotingInput } from './contracts';
import type { SurveyAnswer, SurveyBlock, SurveySummary } from './survey-contracts';
import { DomainError, HTTP } from '../errors';
import { resolveText } from '../localized-content/contracts';

const MIN_OPTIONS = 2;
function isChoice(block: Readonly<SurveyBlock>): boolean {
  return ['SINGLE_CHOICE', 'CHECKBOX', 'DROPDOWN'].includes(block.type);
}
function isDecorative(block: Readonly<SurveyBlock>): boolean {
  return ['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(block.type);
}
function invalidSurvey(): never {
  throw new DomainError(HTTP.badRequest, 'INVALID_SURVEY', 'Проверьте вопросы и настройки анкеты');
}
function validateBlock(block: Readonly<SurveyBlock>, publishing: boolean): void {
  if (
    block.minLength > block.maxLength ||
    (isChoice(block)
      ? block.maxSelections > block.optionIds.length || block.optionIds.length < MIN_OPTIONS
      : block.optionIds.length > 0) ||
    (!isDecorative(block) && block.images.length > 0)
  ) {
    invalidSurvey();
  }
  if (
    publishing &&
    ((!isDecorative(block) && !resolveText(block.title, 'en').value) ||
      (block.type === 'TEXT_BLOCK' && !resolveText(block.content, 'en').value) ||
      (block.type === 'IMAGE_BLOCK' && block.images.length === 0))
  ) {
    invalidSurvey();
  }
}
function validateSurvey(input: Readonly<VotingInput>, publishing = false): void {
  const { survey } = input;
  if (!survey) {
    return;
  }
  const optionIds = survey.blocks.flatMap((block) => block.optionIds);
  if (
    input.electorate.type !== 'GLOBAL_USERS' ||
    input.questions !== undefined ||
    new Set(survey.blocks.map((block) => block.id)).size !== survey.blocks.length ||
    new Set(optionIds).size !== optionIds.length ||
    optionIds.length !== input.options.length ||
    optionIds.some((id) => !input.options.some((option) => option.id === id))
  ) {
    invalidSurvey();
  }
  for (const block of survey.blocks) {
    validateBlock(block, publishing);
  }

  if (
    publishing &&
    (!resolveText(input.title, 'en').value ||
      survey.blocks.every(isDecorative) ||
      input.options.some((option) => !resolveText(option.label, 'en').value))
  ) {
    invalidSurvey();
  }
}
function validAnswer(block: Readonly<SurveyBlock>, value: SurveyAnswer['value']): boolean {
  if (isChoice(block)) {
    return (
      Array.isArray(value) &&
      value.length >= (block.required ? 1 : 0) &&
      value.length <= (block.type === 'CHECKBOX' ? block.maxSelections : 1) &&
      new Set(value).size === value.length &&
      value.every((id) => block.optionIds.includes(id))
    );
  }
  return (
    typeof value === 'string' &&
    (value.trim().length === 0
      ? !block.required
      : value.length >= block.minLength && value.length <= block.maxLength)
  );
}
function validateSurveyAnswers(
  input: Readonly<VotingInput>,
  answers: readonly SurveyAnswer[],
): void {
  const blocks = input.survey?.blocks ?? [];
  if (
    !input.survey ||
    new Set(answers.map((answer) => answer.questionId)).size !== answers.length ||
    answers.some((answer) => {
      const block = blocks.find((item) => item.id === answer.questionId);
      return !block || isDecorative(block) || !validAnswer(block, answer.value);
    }) ||
    blocks.some(
      (block) =>
        !isDecorative(block) &&
        block.required &&
        !answers.some((answer) => answer.questionId === block.id),
    )
  ) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_SURVEY_ANSWERS',
      'Проверьте обязательные вопросы и формат ответов',
    );
  }
}
function summarizeSurvey(
  input: Readonly<VotingInput>,
  responses: readonly (readonly SurveyAnswer[])[],
): SurveySummary[] {
  return (input.survey?.blocks ?? [])
    .filter((block) => !isDecorative(block))
    .map((block) => {
      const values = responses.flatMap((answers) =>
        answers.filter((answer) => answer.questionId === block.id).map((answer) => answer.value),
      );
      return {
        questionId: block.id,
        answered: values.filter((value) =>
          typeof value === 'string' ? value.trim().length > 0 : value.length > 0,
        ).length,
        options: block.optionIds.map((id) => ({
          id,
          count: values.filter((value) => Array.isArray(value) && value.includes(id)).length,
        })),
      };
    });
}
export { validateSurvey, validateSurveyAnswers, summarizeSurvey };
