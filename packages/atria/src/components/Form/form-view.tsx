import type { ReactElement } from 'react';
import { FormSubmit } from './form-submit';
import { Alert } from '../Alert/alert';
import { useFormSubmit } from './use-form-submit';
import { FormErrorSummary } from './form-error-summary';
import { FormLanguageSwitch } from './form-language-switch';
import { FormTranslationContext, useFormLanguage } from './form-context';
import type { FormViewProps } from './form-types';
import { FormFields } from './form-fields';
import styles from './form.module.scss';

function FormView<TValues>(props: FormViewProps<TValues>): ReactElement {
  const { form } = props;
  const submission = useFormSubmit(form, props.submitErrorLabel);
  const { context, changeLanguage } = useFormLanguage(props.languages, props.defaultLanguage);
  const content = (
    <>
      {props.languageSelectorVisible !== false && (
        <FormLanguageSwitch
          languages={props.languages}
          value={context.language}
          label={props.languageLabel}
          hint={props.translationHint}
          onChange={changeLanguage}
        />
      )}
      {submission.error !== null && <Alert tone="danger">{submission.error}</Alert>}
      <FormErrorSummary />
      {props.autoFields !== false && <FormFields form={form} model={props.model} />}
      {props.children}
      {props.submitLabel !== undefined && (
        <FormSubmit pendingLabel={props.submittingLabel}>{props.submitLabel}</FormSubmit>
      )}
    </>
  );
  return (
    <form.AppForm>
      <FormTranslationContext value={context}>
        {props.embedded === true ? (
          <div className={[styles.form, props.className].filter(Boolean).join(' ')}>{content}</div>
        ) : (
          <form
            className={[styles.form, props.className].filter(Boolean).join(' ')}
            onSubmit={submission.handleSubmit}
            noValidate
          >
            {content}
          </form>
        )}
      </FormTranslationContext>
    </form.AppForm>
  );
}
export { FormView };
