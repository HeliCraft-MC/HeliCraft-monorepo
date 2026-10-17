import { validateSurvey } from './survey-domain';
import type { VotingInput, VotingResult } from './contracts';
import { resolveText } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';

const MIN_OPTIONS = 2;
const MAJORITY_DIVISOR = 2;
const PERCENT = 100;
function validateQuestions(input: Readonly<VotingInput>): void {
  const { questions } = input;
  if (questions === undefined) {
    return;
  }
  const optionIds = questions.flatMap((question) => question.optionIds);
  if (
    (['STATE_CITIZENS', 'OFFICE_HOLDERS'].includes(input.electorate.type) &&
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
  eligible: number,
  ballots: readonly Readonly<{ abstain: boolean; choices: readonly string[] }>[],
): VotingResult {
  const participating = ballots.length;
  const abstentions = ballots.filter((ballot) => ballot.abstain).length;
  const decisive = participating - abstentions;
  const quorumMet = eligible > 0 && participating * PERCENT >= eligible * input.rules.quorumPercent;
  return {
    eligible,
    participating,
    abstentions,
    quorumMet,
    options: input.options.map((option) => {
      const votes = ballots.filter(
        (ballot) => !ballot.abstain && ballot.choices.includes(option.id),
      ).length;
      let approved = false;
      switch (input.rules.thresholdKind) {
        case 'SIMPLE_MAJORITY': {
          approved = votes > decisive / MAJORITY_DIVISOR;
          break;
        }
        case 'ABSOLUTE_MAJORITY': {
          approved = votes > eligible / MAJORITY_DIVISOR;
          break;
        }
        case 'UNANIMOUS': {
          approved = votes === eligible;
          break;
        }
        case 'PERCENT': {
          approved = decisive > 0 && votes * PERCENT >= decisive * input.rules.thresholdPercent;
          break;
        }
        default: {
          throw new Error('Unknown voting threshold');
        }
      }
      return { id: option.id, votes, approved: quorumMet && approved };
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
