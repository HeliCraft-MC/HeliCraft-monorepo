import type { ReactElement } from 'react';
import type { FormInstance } from './use-form-model';
import type { FormModel } from './form-model';

function FormFields<TValues>({
  form,
  model,
}: Readonly<{ form: FormInstance<TValues>; model: FormModel<TValues> }>): ReactElement {
  return (
    <>
      {model.fields.map((definition) => (
        <form.AppField key={definition.name} name={definition.name}>
          {(field) => <field.Control {...definition} />}
        </form.AppField>
      ))}
    </>
  );
}
export { FormFields };
