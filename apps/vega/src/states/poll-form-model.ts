import { z } from 'zod';
import type { VotingInput } from '@helicraft/alhena';
import { FormModel } from '@helicraft/atria';
import type { Locale } from '../locales';
import { uiText } from './text';

const HOUR_MS = 3_600_000;
const DEFAULT_DURATION_HOURS = 24;
function initialPoll(): VotingInput {
  const options = [
    { id: crypto.randomUUID(), label: {} },
    { id: crypto.randomUUID(), label: {} },
  ];
  return {
    questions: [
      {
        id: crypto.randomUUID(),
        title: {},
        optionIds: options.map((option) => option.id),
        maxSelections: 1,
      },
    ],
    title: {},
    description: {},
    options,
    opensAt: new Date().toISOString(),
    closesAt: new Date(Date.now() + HOUR_MS * DEFAULT_DURATION_HOURS).toISOString(),
    electorate: { type: 'GLOBAL_USERS' },
    rules: {
      durationHours: DEFAULT_DURATION_HOURS,
      quorumPercent: 0,
      thresholdPercent: 50,
      thresholdKind: 'PERCENT',
      allowAbstain: true,
    },
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
  };
}
function draftInput(input: VotingInput): VotingInput {
  return {
    ...input,
    questions: input.survey
      ? undefined
      : (input.questions ?? [
          {
            id: crypto.randomUUID(),
            title: input.title,
            optionIds: input.options.map((option) => option.id),
            maxSelections: input.maxSelections,
          },
        ]),
  };
}
function pollFormModel(initial: VotingInput, locale: Locale): FormModel<VotingInput> {
  const localized = z.record(z.string(), z.string().optional());
  return new FormModel<VotingInput>({
    defaultValues: initial,
    schema: z.object({
      title: localized.refine(
        (value) => Object.values(value).some((text) => text !== undefined && text.trim() !== ''),
        uiText(
          locale,
          'Укажите название хотя бы на одном языке.',
          'Enter a title in at least one language.',
        ),
      ),
      description: localized,
      opensAt: z.iso.datetime(),
      closesAt: z.iso.datetime(),
    }),
    fields: [
      { kind: 'localized', name: 'title', label: uiText(locale, 'Название опроса', 'Poll title') },
      {
        kind: 'localized-multiline',
        name: 'description',
        label: uiText(locale, 'Описание опроса', 'Poll description'),
      },
    ],
  });
}
export { pollFormModel, initialPoll, draftInput };
