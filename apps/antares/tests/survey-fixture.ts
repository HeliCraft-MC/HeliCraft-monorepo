import type { VotingInput } from '../src/modules/voting/contracts';
import type { SurveyBlock } from '../src/modules/voting/survey-contracts';

const TEXT_LIMIT = 200;
function surveyBlock(type: SurveyBlock['type'], title: string): SurveyBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title: { en: title },
    description: {},
    required: false,
    optionIds: [],
    maxSelections: 1,
    minLength: 0,
    maxLength: TEXT_LIMIT,
    content: {},
    style: 'NORMAL',
    images: [],
    displayMode: 'GRID',
    showCaptions: true,
  };
}
function surveyInput(base: VotingInput): VotingInput {
  const options = ['North', 'South'].map((label) => ({
    id: crypto.randomUUID(),
    label: { en: label },
  }));
  return {
    ...base,
    title: { en: 'Survey', ru: 'Анкета' },
    questions: undefined,
    electorate: { type: 'GLOBAL_USERS' },
    options,
    survey: {
      oneResponsePerUser: true,
      blocks: [
        { ...surveyBlock('SHORT_TEXT', 'Your idea'), required: true, minLength: 2 },
        {
          ...surveyBlock('CHECKBOX', 'Where?'),
          required: true,
          optionIds: options.map((option) => option.id),
          maxSelections: 2,
        },
        surveyBlock('PARAGRAPH', 'Comment'),
        {
          ...surveyBlock('TEXT_BLOCK', ''),
          content: { en: '**Hello** <script>alert(1)</script>' },
        },
      ],
    },
  };
}
export { surveyInput, surveyBlock };
