import { useId } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublicTaxation } from '@helicraft/alhena';
import { Alert, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function TaxRegimeClaimField({
  stateId,
  initialLawId,
}: Readonly<{ stateId: string; initialLawId?: string }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const laws = useQuery({
    queryKey: ['public-taxation-regime-bases', stateId, locale],
    retry: false,
    queryFn: async () => {
      const result = await getPublicTaxation({
        client: createClient({ credentials: 'omit' }),
        path: { stateId },
        query: { locale },
        throwOnError: true,
      });
      return result.data.laws.filter((law) => law.rule.regime === undefined);
    },
  });
  return (
    <FormField
      label={uiText(locale, 'Изменяемое общее требование', 'General claim to change')}
      htmlFor={id}
    >
      <Select id={id} name="regimeTargetLawId" required defaultValue={initialLawId ?? ''}>
        <option value="">
          {uiText(locale, 'Выберите действующий общий закон', 'Select an active general law')}
        </option>
        {laws.data?.map((law) => (
          <option key={law.lawId} value={law.lawId}>
            {displayText(law.name, locale)}
          </option>
        ))}
      </Select>
      {laws.isPending && <output>{uiText(locale, 'Загрузка законов…', 'Loading laws…')}</output>}
      {laws.isError && (
        <Alert tone="danger">
          {uiText(locale, 'Законы временно недоступны.', 'Laws temporarily unavailable.')}
        </Alert>
      )}
    </FormField>
  );
}
export { TaxRegimeClaimField };
