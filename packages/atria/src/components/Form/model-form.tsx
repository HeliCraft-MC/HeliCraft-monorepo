import type { ReactElement } from 'react';
import { useFormModel } from './use-form-model';
import { FormView } from './form-view';
import type { ModelFormProps } from './form';

function ModelForm<TValues>({
  model,
  defaultValues,
  onSubmit,
  onValuesChange,
  children,
  ...presentation
}: ModelFormProps<TValues>): ReactElement {
  const form = useFormModel({ model, defaultValues, onSubmit, onValuesChange });
  return (
    <FormView {...presentation} model={model} form={form}>
      {typeof children === 'function' ? children(form) : children}
    </FormView>
  );
}
export { ModelForm };
