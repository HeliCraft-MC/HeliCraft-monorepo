import { useEffect } from 'react';
import type { FormInstance } from './use-form-model';

function useFormValueChanges<TValues>(
  form: FormInstance<TValues>,
  onChange?: (value: TValues) => void,
): void {
  useEffect(() => {
    let previous = form.state.values;
    const subscription = form.store.subscribe(() => {
      const next = form.state.values;
      if (next !== previous) {
        previous = next;
        onChange?.(next);
      }
    });
    return (): void => {
      subscription.unsubscribe();
    };
  }, [form, onChange]);
}
export { useFormValueChanges };
