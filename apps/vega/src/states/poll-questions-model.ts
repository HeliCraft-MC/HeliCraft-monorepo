import type { VotingInput } from '@helicraft/alhena';

type PollQuestion = NonNullable<VotingInput['questions']>[number];
const MAX_OPTIONS = 50;
const MAX_QUESTIONS = 20;
function addQuestion(input: VotingInput): VotingInput {
  const options = [
    { id: crypto.randomUUID(), label: {} },
    { id: crypto.randomUUID(), label: {} },
  ];
  return {
    ...input,
    options: [...input.options, ...options],
    questions: [
      ...(input.questions ?? []),
      {
        id: crypto.randomUUID(),
        title: {},
        optionIds: options.map((option) => option.id),
        maxSelections: 1,
      },
    ],
  };
}
function changeQuestion(input: VotingInput, question: PollQuestion): VotingInput {
  return {
    ...input,
    questions: input.questions?.map((item) => (item.id === question.id ? question : item)),
  };
}
function removeQuestion(input: VotingInput, question: PollQuestion): VotingInput {
  return {
    ...input,
    questions: input.questions?.filter((item) => item.id !== question.id),
    options: input.options.filter((option) => !question.optionIds.includes(option.id)),
  };
}
function moveQuestion(input: VotingInput, id: string, direction: number): VotingInput {
  const questions = [...(input.questions ?? [])];
  const position = questions.findIndex((question) => question.id === id);
  const target = position + direction;
  const current = questions[position];
  const other = questions[target];
  if (current === undefined || other === undefined) {
    return input;
  }
  questions[position] = other;
  questions[target] = current;
  return { ...input, questions };
}
export {
  addQuestion,
  changeQuestion,
  removeQuestion,
  moveQuestion,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  type PollQuestion,
};
