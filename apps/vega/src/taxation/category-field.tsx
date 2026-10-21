import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listTaxCategories } from '@helicraft/alhena';
import { Alert, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function TaxCategoryField({
  value,
  name = 'category',
  label,
}: Readonly<{ value?: string; name?: string; label?: string }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [selected, setSelected] = useState(value ?? 'TRANSFER');
  const change = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  const categories = useQuery({
    queryKey: ['public-tax-categories'],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const result = await listTaxCategories({
        client: createClient({ credentials: 'omit' }),
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  return (
    <FormField
      label={label ?? uiText(locale, 'Категория налога', 'Tax category')}
      htmlFor={id}
      help={uiText(
        locale,
        'Общий расширяемый реестр задаёт постоянный юридический код и понятное название. Выбор категории принадлежит закону, а не отправителю платежа. Договор явно сопоставляет категории обеих сторон.',
        'The extensible platform registry supplies a stable legal code and display name. The law selects the category, never the payer. Treaties explicitly map both parties’ categories.',
      )}
    >
      <Select
        id={id}
        name={name}
        required
        value={selected}
        onChange={change}
        aria-busy={categories.isPending}
      >
        <option value="">{uiText(locale, 'Выберите категорию', 'Select a category')}</option>
        {value !== undefined &&
          categories.data?.some((category) => category.code === value) !== true && (
            <option value={value}>
              {uiText(locale, 'Сохранённая категория', 'Preserved category')}: {value}
            </option>
          )}
        {categories.data?.map((category) => (
          <option key={category.code} value={category.code}>
            {displayText(category.name, locale)} · {category.code}
          </option>
        ))}
      </Select>
      {categories.isPending && (
        <output>{uiText(locale, 'Загрузка реестра…', 'Loading registry…')}</output>
      )}
      {categories.isError && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Реестр категорий временно недоступен. Повторите попытку позже.',
            'The category registry is temporarily unavailable. Please try again later.',
          )}
        </Alert>
      )}
    </FormField>
  );
}
export { TaxCategoryField };
