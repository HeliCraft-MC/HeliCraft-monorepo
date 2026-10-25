import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Form } from './form';
import type { FormInstance } from './use-form-model';
import { FormModel } from './form-model';
import { Button } from '../Button/button';

interface Values {
  title: Partial<Record<string, string>>;
  description: Partial<Record<string, string>>;
}
const languages = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];
class ExampleForm extends FormModel<Values> {
  public constructor() {
    super({
      defaultValues: { title: {}, description: {} },
      schema: {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate(value) {
            if (
              typeof value !== 'object' ||
              value === null ||
              !('title' in value) ||
              typeof value.title !== 'object' ||
              value.title === null ||
              !Object.values(value.title).some(
                (text: unknown) => typeof text === 'string' && text.trim() !== '',
              )
            ) {
              return { issues: [{ message: 'Enter a title', path: ['title'] }] };
            }
            return { value };
          },
        },
      },
      fields: [
        { kind: 'localized', name: 'title', label: 'Title' },
        { kind: 'localized-multiline', name: 'description', label: 'Description' },
      ],
    });
  }
}
function Harness({ submit }: Readonly<{ submit: (value: Values) => void }>): ReactElement {
  const model = useMemo(() => new ExampleForm(), []);
  return (
    <Form
      model={model}
      onSubmit={submit}
      languages={languages}
      defaultLanguage="en"
      languageLabel="Content language"
      translationHint="All fields use the selected language"
    >
      <Button type="submit">Save</Button>
    </Form>
  );
}
afterEach(cleanup);
describe('model-driven form', () => {
  it('generates fields, switches all translations together and submits every explicit translation', async () => {
    const submit = vi.fn<(value: Values) => void>();
    render(<Harness submit={submit} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Aurora' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A community' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Content language' }), {
      target: { value: 'ru' },
    });
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Аврора' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Content language' }), {
      target: { value: 'en' },
    });
    expect(screen.getByLabelText('Description')).toHaveValue('A community');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({
        title: { en: 'Aurora', ru: 'Аврора' },
        description: { en: 'A community' },
      });
    });
  });
  it('shows schema errors beside fields and prevents invalid submission', async () => {
    const submit = vi.fn<(value: Values) => void>();
    render(<Harness submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('Enter a title');
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(submit).not.toHaveBeenCalled();
  });
  it('retains input after an asynchronous submission failure and supports retry with the same values', async () => {
    const model = new ExampleForm();
    const submit = vi
      .fn<(value: Values) => Promise<void>>()
      .mockImplementation(async () => {
        await Promise.resolve();
      })
      .mockRejectedValueOnce(new Error('Submission unavailable'));
    render(
      <Form
        model={model}
        onSubmit={submit}
        languages={languages}
        defaultLanguage="en"
        languageLabel="Content language"
        translationHint="Independent translations"
        submitLabel="Save"
      />,
    );
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Retryable title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Submission unavailable')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Retryable title');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledTimes(2);
    });
    expect(submit).toHaveBeenLastCalledWith({ title: { en: 'Retryable title' }, description: {} });
  });
  it('notifies autosave when a custom control changes an unregistered nested field through the library instance', async () => {
    const model = new ExampleForm();
    const changes = vi.fn<(value: Values) => void>();
    const submit = vi.fn<(value: Values) => void>();
    const instance: { form?: FormInstance<Values> } = {};
    render(
      <Form
        model={model}
        onSubmit={submit}
        onValuesChange={changes}
        languages={languages}
        defaultLanguage="en"
        languageLabel="Content language"
        translationHint="All fields use this language"
      >
        {(form) => {
          instance.form = form;
          return null;
        }}
      </Form>,
    );
    act(() => {
      instance.form?.setFieldValue('title.ru', 'Аврора');
    });
    await waitFor(() => {
      expect(changes).toHaveBeenCalledWith({ title: { ru: 'Аврора' }, description: {} });
    });
  });
});
