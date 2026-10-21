import { validateSurvey } from './survey-domain';
import type { VotingInput, VotingResult } from './contracts';
import { resolveText } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';
import { calculateWeights } from './weights';
import type { WeightedBallot } from './weights';

const MIN_OPTIONS = 2;
function validateQuestions(input: Readonly<VotingInput>): void {
  const { questions } = input;
  if (questions === undefined) {
    return;
  }
  const optionIds = questions.flatMap((question) => question.optionIds);
  if (
    ([
      'STATE_CITIZENS',
      'OFFICE_HOLDERS',
      'COMPANY_SHAREHOLDERS',
      'COMPANY_OFFICE_HOLDERS',
    ].includes(input.electorate.type) &&
      questions.length > 1) ||
    new Set(questions.map((question) => question.id)).size !== questions.length ||
    new Set(optionIds).size !== optionIds.length ||
    optionIds.length !== input.options.length ||
    optionIds.some((id) => !input.options.some((option) => option.id === id)) ||
    questions.some(
      (question) =>
        !resolveText(question.title, 'en').value ||
        question.maxSelections > question.optionIds.length,
    )
  ) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_QUESTIONS',
      'Проверьте вопросы, варианты и ограничения выбора',
    );
  }
}
function validateVoting(input: Readonly<VotingInput>): void {
  if (input.survey) {
    validateSurvey(input);
    if (Date.parse(input.closesAt) <= Date.parse(input.opensAt)) {
      throw new DomainError(
        HTTP.badRequest,
        'INVALID_WINDOW',
        'Завершение должно быть позже открытия',
      );
    }
    return;
  }
  validateQuestions(input);
  if (
    !resolveText(input.title, 'en').value ||
    input.options.some((option) => !resolveText(option.label, 'en').value)
  ) {
    throw new DomainError(
      HTTP.badRequest,
      'VOTING_TEXT_REQUIRED',
      'Укажите название и варианты голосования',
    );
  }
  if (
    input.options.length < MIN_OPTIONS ||
    new Set(input.options.map((option) => option.id)).size !== input.options.length ||
    (input.questions === undefined && input.maxSelections > input.options.length)
  ) {
    throw new DomainError(HTTP.badRequest, 'INVALID_OPTIONS', 'Некорректные варианты голосования');
  }
  if (Date.parse(input.closesAt) <= Date.parse(input.opensAt)) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_WINDOW',
      'Завершение должно быть позже открытия',
    );
  }
}
function calculateResult(
  input: Readonly<VotingInput>,
  electorate: number | Readonly<{ count: number; weight: string }>,
  ballots: readonly WeightedBallot[],
): VotingResult {
  const eligible = typeof electorate === 'number' ? electorate : electorate.count;
  const weights = calculateWeights(
    input,
    typeof electorate === 'number' ? electorate.toString() : electorate.weight,
    ballots,
  );
  const participating = ballots.length;
  const abstentions = ballots.filter((ballot) => ballot.abstain).length;
  return {
    eligible,
    participating,
    abstentions,
    quorumMet: weights.quorumMet,
    weights: {
      eligible: weights.eligible,
      participating: weights.participating,
      abstentions: weights.abstentions,
      options: weights.options.map(({ id, weight }) => ({ id, weight })),
    },
    options: input.options.map((option) => {
      const votes = ballots.filter(
        (ballot) => !ballot.abstain && ballot.choices.includes(option.id),
      ).length;
      return {
        id: option.id,
        votes,
        approved: weights.options.some(
          (weighted) => weighted.id === option.id && weighted.approved,
        ),
      };
    }),
  };
}
function validateBallot(
  input: Readonly<VotingInput>,
  choices: readonly string[],
  abstain: boolean,
): void {
  if (input.survey) {
    throw new DomainError(HTTP.badRequest, 'SURVEY_ANSWERS_REQUIRED', 'Отправьте ответы анкеты');
  }
  const selectionValid =
    input.questions === undefined
      ? choices.length > 0 && choices.length <= input.maxSelections
      : input.questions.every((question) => {
          const selected = choices.filter((id) => question.optionIds.includes(id)).length;
          return selected > 0 && selected <= question.maxSelections;
        });
  const valid = abstain ? input.rules.allowAbstain && choices.length === 0 : selectionValid;
  if (
    !valid ||
    new Set(choices).size !== choices.length ||
    choices.some((id) => !input.options.some((option) => option.id === id))
  ) {
    throw new DomainError(HTTP.badRequest, 'INVALID_BALLOT', 'Некорректный бюллетень');
  }
}
export { validateVoting, calculateResult, validateBallot };
