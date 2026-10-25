import type { DeepKeysOfType, StandardSchemaV1 } from '@tanstack/react-form';

type FormText = Readonly<Partial<Record<string, string>>>;
interface FormFieldOptions {
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
}
type FormFieldDefinition<TValues> = FormFieldOptions &
  (
    | {
        readonly kind: 'text' | 'textarea';
        readonly name: DeepKeysOfType<TValues, string>;
        readonly maxLength?: number;
      }
    | {
        readonly kind: 'localized' | 'localized-multiline';
        readonly name: DeepKeysOfType<TValues, FormText>;
      }
    | {
        readonly kind: 'select';
        readonly name: DeepKeysOfType<TValues, string>;
        readonly options: readonly { readonly value: string; readonly label: string }[];
      }
  );
interface FormModelOptions<TValues> {
  readonly defaultValues: TValues;
  readonly schema: StandardSchemaV1;
  readonly fields: readonly FormFieldDefinition<TValues>[];
}
class FormModel<TValues> {
  public readonly defaultValues: TValues;
  public readonly schema: StandardSchemaV1<TValues, unknown>;
  public readonly fields: readonly FormFieldDefinition<TValues>[];
  public constructor(options: FormModelOptions<TValues>) {
    this.defaultValues = options.defaultValues;
    this.schema = {
      '~standard': {
        version: 1,
        vendor: options.schema['~standard'].vendor,
        validate: options.schema['~standard'].validate,
      },
    };
    this.fields = options.fields;
  }
}
export { FormModel, type FormModelOptions, type FormFieldDefinition, type FormText };
