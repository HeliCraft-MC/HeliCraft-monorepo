import type { ReactElement } from 'react';
import { Alert } from '../Alert/alert';
import { useFormContext } from './form-context';
import { formErrorMessages } from './form-errors';

function selectErrors(state: Readonly<{ errors: readonly unknown[] }>): readonly unknown[] {
  return state.errors;
}
function FormErrorSummary(): ReactElement {
  const form = useFormContext();
  return (
    <form.Subscribe selector={selectErrors}>
      {(errors) => {
        const messages = [...new Set(formErrorMessages(errors))];
        return messages.length === 0 ? null : (
          <Alert tone="danger">
            <ul>
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        );
      }}
    </form.Subscribe>
  );
}
export { FormErrorSummary };
