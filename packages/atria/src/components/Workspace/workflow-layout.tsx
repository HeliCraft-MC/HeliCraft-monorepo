import { useCallback } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { WorkspaceNavigation } from './workspace-navigation';
import styles from './workspace.module.scss';

interface WorkflowStep {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
}
function WorkflowLayout({
  label,
  steps,
  value,
  onChange,
  children,
}: Readonly<{
  label: string;
  steps: readonly WorkflowStep[];
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}>): ReactElement {
  const select = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange],
  );
  return (
    <div className={styles.workflow}>
      <WorkspaceNavigation
        label={label}
        currentLabel={steps.find((step) => step.id === value)?.label ?? label}
        className={styles.workflowNavigation}
      >
        {steps.map((step, index) => (
          <div key={step.id}>
            {step.group !== undefined && step.group !== steps[index - 1]?.group && (
              <p className={styles.workflowGroup}>{step.group}</p>
            )}
            <button
              type="button"
              value={step.id}
              onClick={select}
              aria-current={value === step.id ? 'step' : undefined}
              data-workspace-navigation-item
            >
              {step.label}
            </button>
          </div>
        ))}
      </WorkspaceNavigation>
      <div className={styles.workflowContent}>{children}</div>
    </div>
  );
}
export { WorkflowLayout, type WorkflowStep };
