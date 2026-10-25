import { useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import type { ValidateStateDraftResponse } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { STEPS } from './wizard-steps';

function issueStep(path: string): number {
  if (path.startsWith('governance.offices')) {
    return STEPS.OFFICES;
  }
  if (path.startsWith('governance.policies')) {
    return STEPS.DECISIONS;
  }
  if (path.startsWith('governance.votingDefaults')) {
    return STEPS.VOTING;
  }
  if (path.startsWith('governance')) {
    return STEPS.PRESET;
  }
  if (path.startsWith('constitution')) {
    return STEPS.CONSTITUTION;
  }
  if (path.startsWith('citizenship')) {
    return STEPS.CITIZENSHIP;
  }
  if (path.startsWith('cofounder')) {
    return STEPS.FOUNDERS;
  }
  if (path.startsWith('horizontalFlag') || path.startsWith('verticalBanner')) {
    return STEPS.FLAGS;
  }
  return STEPS.BASICS;
}
function DraftIssues({
  issues,
  onStepChange,
}: Readonly<{
  issues: ValidateStateDraftResponse['issues'];
  onStepChange: (step: number) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const edit = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      onStepChange(Number(event.currentTarget.value));
    },
    [onStepChange],
  );
  return (
    <ul aria-live="polite">
      {issues.map((issue) => (
        <li key={`${issue.path}-${issue.message}`}>
          <strong>
            {issue.severity === 'ERROR'
              ? uiText(locale, 'Ошибка', 'Error')
              : uiText(locale, 'Предупреждение', 'Warning')}
            :
          </strong>{' '}
          {issue.message}{' '}
          <Button tone="quiet" value={String(issueStep(issue.path))} onClick={edit}>
            {uiText(locale, 'Перейти к настройке', 'Go to setting')}
          </Button>
        </li>
      ))}
    </ul>
  );
}
export { DraftIssues };
