import type { StandardSchemaV1 } from '@tanstack/react-form';
import { createFormHook } from '@tanstack/react-form';
import { fieldContext, formContext } from './form-context';
import { FormControl } from './form-control';
import { useFormValueChanges } from './use-form-value-changes';
import type { FormModel } from './form-model';

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { Control: FormControl },
  formComponents: {},
});
interface UseFormModelOptions<TValues> {
  readonly model: FormModel<TValues>;
  readonly defaultValues?: TValues;
  readonly onValuesChange?: (values: TValues) => void;
  readonly onSubmit: (values: TValues) => void | Promise<void>;
}
type FormInstance<TValues> = ReturnType<
  typeof useAppForm<
    TValues,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    StandardSchemaV1<TValues, unknown>,
    undefined,
    undefined,
    undefined,
    undefined,
    unknown
  >
>;
function useFormModel<TValues>({
  model,
  defaultValues,
  onSubmit,
  onValuesChange,
}: UseFormModelOptions<TValues>): FormInstance<TValues> {
  const form = useAppForm<
    TValues,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    StandardSchemaV1<TValues, unknown>,
    undefined,
    undefined,
    undefined,
    undefined,
    unknown
  >({
    defaultValues: defaultValues ?? model.defaultValues,
    validators: { onSubmit: model.schema },
    onSubmit: async ({ value }): Promise<void> => {
      await onSubmit(value);
    },
  });
  useFormValueChanges(form, onValuesChange);
  return form;
}

export { useFormModel, type FormInstance };
