import { useCallback, useState } from 'react';
import type { SubmitEvent } from 'react';
import { focusInvalidField } from './form-errors';
import type { FormInstance } from './use-form-model';

interface FormSubmission {
  readonly error: string | null;
  readonly handleSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
function useFormSubmit<TValues>(form: FormInstance<TValues>, errorLabel?: string): FormSubmission {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      const element = event.currentTarget;
      async function handle(): Promise<void> {
        setSubmissionError(null);
        try {
          await form.handleSubmit();
        } catch (error) {
          setSubmissionError(
            error instanceof Error ? error.message : (errorLabel ?? 'Unable to submit the form.'),
          );
        }
        requestAnimationFrame(() => {
          focusInvalidField(element);
        });
      }
      void handle();
    },
    [form, errorLabel],
  );
  return { error: submissionError, handleSubmit: submit };
}
export { useFormSubmit };
