import type { FormText } from './form-model';

function isFormText(value: unknown): value is FormText {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item: unknown) => item === undefined || typeof item === 'string')
  );
}
function formTextValue(value: unknown, localized: boolean, language: string): string {
  if (localized && isFormText(value)) {
    return value[language] ?? '';
  }
  return typeof value === 'string' ? value : '';
}
export { isFormText, formTextValue };
