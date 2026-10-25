import { useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import styles from './workspace.module.scss';

interface EditorStep {
  readonly id: string;
  readonly label: string;
}
interface StepNavigationProps {
  readonly label: string;
  readonly steps: readonly EditorStep[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}
function StepNavigation({ label, steps, value, onChange }: StepNavigationProps): ReactElement {
  const select = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange],
  );
  return (
    <nav aria-label={label} className={styles.steps}>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              value={step.id}
              onClick={select}
              aria-current={value === step.id ? 'step' : undefined}
            >
              <span aria-hidden="true">{index + 1}</span>
              {step.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
export { StepNavigation, type StepNavigationProps, type EditorStep };
