import type { SurveyBlock, VotingInput } from '@helicraft/alhena';

const MAX_BLOCKS = 100;
const MAX_OPTIONS = 50;
const DEFAULT_TEXT_LIMIT = 500;
function newBlock(): SurveyBlock {
  return {
    id: crypto.randomUUID(),
    type: 'SHORT_TEXT',
    title: {},
    description: {},
    required: false,
    optionIds: [],
    maxSelections: 1,
    minLength: 0,
    maxLength: DEFAULT_TEXT_LIMIT,
    content: {},
    style: 'NORMAL',
    images: [],
    displayMode: 'GRID',
    showCaptions: true,
  };
}
function changeBlock(input: VotingInput, block: SurveyBlock): VotingInput {
  if (!input.survey) {
    return input;
  }
  return {
    ...input,
    survey: {
      ...input.survey,
      blocks: input.survey.blocks.map((item) => (item.id === block.id ? block : item)),
    },
  };
}
function insertBlock(input: VotingInput, index: number, source?: SurveyBlock): VotingInput {
  if (!input.survey || input.survey.blocks.length >= MAX_BLOCKS) {
    return input;
  }
  const options =
    source === undefined
      ? []
      : source.optionIds.flatMap((id) => {
          const option = input.options.find((item) => item.id === id);
          return option ? [{ ...option, id: crypto.randomUUID() }] : [];
        });
  if (input.options.length + options.length > MAX_OPTIONS) {
    return input;
  }
  const block =
    source === undefined
      ? newBlock()
      : { ...source, id: crypto.randomUUID(), optionIds: options.map((option) => option.id) };
  const blocks = [...input.survey.blocks];
  blocks.splice(index, 0, block);
  return { ...input, options: [...input.options, ...options], survey: { ...input.survey, blocks } };
}
function removeBlock(input: VotingInput, block: SurveyBlock): VotingInput {
  if (!input.survey) {
    return input;
  }
  return {
    ...input,
    options: input.options.filter((option) => !block.optionIds.includes(option.id)),
    survey: { ...input.survey, blocks: input.survey.blocks.filter((item) => item.id !== block.id) },
  };
}
function moveBlock(input: VotingInput, id: string, target: number): VotingInput {
  if (!input.survey || target < 0 || target >= input.survey.blocks.length) {
    return input;
  }
  const blocks = [...input.survey.blocks];
  const index = blocks.findIndex((block) => block.id === id);
  const block = blocks[index];
  if (!block) {
    return input;
  }
  blocks.splice(index, 1);
  blocks.splice(target, 0, block);
  return { ...input, survey: { ...input.survey, blocks } };
}
const blockTypes: readonly SurveyBlock['type'][] = [
  'SHORT_TEXT',
  'PARAGRAPH',
  'SINGLE_CHOICE',
  'CHECKBOX',
  'DROPDOWN',
  'TEXT_BLOCK',
  'IMAGE_BLOCK',
];
function isBlockType(value: string): value is SurveyBlock['type'] {
  return blockTypes.some((type) => type === value);
}
function changeType(input: VotingInput, block: SurveyBlock, type: string): VotingInput {
  if (!isBlockType(type)) {
    return input;
  }
  const choice = ['SINGLE_CHOICE', 'CHECKBOX', 'DROPDOWN'].includes(type);
  if (type === block.type) {
    return input;
  }
  if (choice && block.optionIds.length > 0) {
    return changeBlock(input, {
      ...block,
      type,
      maxSelections: type === 'CHECKBOX' ? block.maxSelections : 1,
    });
  }
  const options = choice
    ? [
        { id: crypto.randomUUID(), label: {} },
        { id: crypto.randomUUID(), label: {} },
      ]
    : [];
  if (input.options.length - block.optionIds.length + options.length > MAX_OPTIONS) {
    return input;
  }
  const next = changeBlock(input, {
    ...block,
    type,
    images: [],
    optionIds: options.map((option) => option.id),
    maxSelections: 1,
  });
  return {
    ...next,
    options: [
      ...input.options.filter((option) => !block.optionIds.includes(option.id)),
      ...options,
    ],
  };
}
export {
  newBlock,
  changeBlock,
  insertBlock,
  removeBlock,
  moveBlock,
  changeType,
  blockTypes,
  MAX_BLOCKS,
  MAX_OPTIONS,
};
