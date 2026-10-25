import type { ReactElement, ReactNode } from 'react';
import type { FormInstance } from './use-form-model';
import { FormView } from './form-view';
import type { FormViewProps } from './form-types';
import { ModelForm } from './model-form';

interface ModelFormProps<TValues> extends Omit<FormViewProps<TValues>, 'form' | 'children'> {
  readonly form?: undefined;
  readonly defaultValues?: TValues;
  readonly onSubmit: (values: TValues) => void | Promise<void>;
  readonly onValuesChange?: (values: TValues) => void;
  readonly children?: ReactNode | ((form: FormInstance<TValues>) => ReactNode);
}
type FormProps<TValues> = FormViewProps<TValues> | ModelFormProps<TValues>;
function Form<TValues>(props: FormProps<TValues>): ReactElement {
  return props.form === undefined ? <ModelForm {...props} /> : <FormView {...props} />;
}
export { Form, type FormProps, type ModelFormProps };
