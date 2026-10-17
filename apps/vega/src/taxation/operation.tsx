import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEconomicOperation } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TaxBreakdown } from './breakdown';

function OperationDetails({ id, code }: Readonly<{ id: string; code: string }>): ReactElement {
  const { locale } = useTranslation();
  const [requested, setRequested] = useState(false);
  const request = useCallback((): void => {
    setRequested(true);
  }, []);
  const query = useQuery({
    queryKey: ['economic-operation', id],
    enabled: requested,
    retry: false,
    queryFn: async () => {
      const result = await getEconomicOperation({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <p>
        {uiText(locale, 'Экономическая операция', 'Economic operation')}: {id}
      </p>
      {!requested && (
        <Button tone="quiet" onClick={request}>
          {uiText(locale, 'Показать сохранённый налоговый расчёт', 'Show recorded tax calculation')}
        </Button>
      )}
      {requested && query.isPending && (
        <output>{uiText(locale, 'Загрузка расчёта…', 'Loading calculation…')}</output>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <>
          <TaxBreakdown calculation={query.data.calculation} code={code} />
          <ul>
            {query.data.journals.map((journal) => (
              <li key={journal.id}>
                {uiText(locale, 'Проводка', 'Journal')}: {journal.id} ·{' '}
                {journal.assessmentId ?? uiText(locale, 'Основной перевод', 'Principal transfer')}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
export { OperationDetails };
