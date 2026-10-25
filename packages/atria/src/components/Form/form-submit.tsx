import type { ReactElement, ReactNode } from 'react';
import { Button } from '../Button/button';
import { useFormContext } from './form-context';

function selectSubmitting(state: Readonly<{ isSubmitting: boolean }>): boolean {
  return state.isSubmitting;
}
interface FormSubmitProps {
  readonly children: ReactNode;
  readonly pendingLabel?: string;
  readonly disabled?: boolean;
}
function FormSubmit({ children, pendingLabel, disabled = false }: FormSubmitProps): ReactElement {
  const form = useFormContext();
  return (
    <form.Subscribe selector={selectSubmitting}>
      {(pending) => (
        <Button type="submit" disabled={disabled || pending}>
          {pending && pendingLabel !== undefined ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
export { FormSubmit, type FormSubmitProps };
