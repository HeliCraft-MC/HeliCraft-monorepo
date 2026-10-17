import { describe, expect, it } from 'vitest';
import { validateBallot, validateVoting } from '../src/modules/voting/domain';
import {
  validateSurvey,
  validateSurveyAnswers,
  summarizeSurvey,
} from '../src/modules/voting/survey-domain';
import { surveyMarkdown } from '../src/modules/voting/survey-markdown';
import { surveyInput, surveyBlock } from './survey-fixture';
import { emptyConfiguration } from '../src/modules/states/domain';
import type { VotingInput } from '../src/modules/voting/contracts';
import type { SurveyAnswer } from '../src/modules/voting/survey-contracts';

function fixture(): { input: VotingInput; answers: SurveyAnswer[] } {
  const input = surveyInput({
    title: {},
    description: {},
    options: [],
    opensAt: '2026-10-17T00:00:00Z',
    closesAt: '2026-10-18T00:00:00Z',
    electorate: { type: 'GLOBAL_USERS' },
    rules: emptyConfiguration().governance.votingDefaults,
    maxSelections: 1,
    resultVisibility: 'PUBLIC',
  });
  const [text, choice] = input.survey?.blocks ?? [];
  if (!text || !choice) {
    throw new Error('Missing fixture');
  }
  return {
    input,
    answers: [
      { questionId: text.id, value: 'A port' },
      { questionId: choice.id, value: choice.optionIds },
    ],
  };
}
describe('hybrid survey domain', () => {
  it('accepts mixed blocks, optional omissions and choice limits while rejecting invalid submissions', () => {
    const { input, answers } = fixture();
    expect(() => {
      validateSurvey(input, true);
      validateSurveyAnswers(input, answers);
    }).not.toThrow();
    for (const invalid of [
      [],
      answers.slice(0, 1),
      [...answers, ...answers],
      [{ questionId: crypto.randomUUID(), value: 'unknown' }],
      answers.map((answer) => ({ ...answer, value: 'wrong type' })),
      answers.map((answer) => ({ ...answer, value: [] })),
    ]) {
      expect(() => {
        validateSurveyAnswers(input, invalid);
      }).toThrow('Проверьте');
    }
    const [first] = answers;
    if (!first) {
      throw new Error('Missing fixture');
    }
    expect(() => {
      validateSurveyAnswers(input, [{ ...first, value: ' ' }, ...answers.slice(1)]);
    }).toThrow('Проверьте');
    const result = summarizeSurvey(input, [answers, answers]);
    expect(result[0]?.answered).toBe(2);
    expect(result[1]?.options.map((option) => option.count)).toStrictEqual([2, 2]);
    expect(result[2]?.answered).toBe(0);
  });
  it('keeps incomplete drafts private and excludes survey settings from governance votes', () => {
    const { input } = fixture();
    const draft = {
      ...input,
      title: {},
      options: [],
      survey: { oneResponsePerUser: true, blocks: [surveyBlock('SHORT_TEXT', '')] },
    };
    expect(() => {
      validateVoting(draft);
    }).not.toThrow();
    expect(() => {
      validateSurvey(draft, true);
    }).toThrow('Проверьте');
    expect(() => {
      validateSurvey({
        ...input,
        electorate: { type: 'STATE_CITIZENS', stateId: crypto.randomUUID() },
      });
    }).toThrow('Проверьте');
    expect(() => {
      validateBallot(input, [], false);
    }).toThrow('анкеты');
    expect(() => {
      validateVoting({ ...input, survey: undefined, options: [] });
    }).toThrow('варианты');
  });
  it('renders localized Markdown with the shared sanitizer', async () => {
    const { input } = fixture();
    const html = await surveyMarkdown(input);
    expect(html[0]?.html.en).toContain('<strong>Hello</strong>');
    expect(html[0]?.html.en).not.toContain('<script');
    expect(html[0]?.html.ru).toBe(html[0]?.html.en);
  });
});
