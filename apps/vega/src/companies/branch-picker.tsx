import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createClient,
  getPublishedCompanyBranch,
  listPublishedCompanyBranches,
} from '@helicraft/alhena';
import type { PublishedCompanyBranch } from '@helicraft/alhena';
import { Alert, FormField, Select } from '@helicraft/atria';
import { MonetaryPagination } from '../monetary/pagination';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function eligibleBranch(
  branch: PublishedCompanyBranch | null,
  companyId: string,
  stateId?: string,
): branch is PublishedCompanyBranch {
  return (
    branch !== null &&
    branch.companyId === companyId &&
    branch.status === 'ACTIVE' &&
    (stateId === undefined || branch.stateId === stateId)
  );
}
function CompanyBranchPicker({
  companyId,
  stateId,
  initialId,
  name = 'sourceBranchId',
  required = false,
}: Readonly<{
  companyId: string;
  stateId?: string;
  initialId?: string;
  name?: string;
  required?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PublishedCompanyBranch | null | undefined>();
  const initial = useQuery({
    queryKey: ['public-company-branch', initialId],
    enabled: initialId !== undefined && selected === undefined,
    retry: false,
    queryFn: async () => {
      if (initialId === undefined) {
        throw new Error('Branch identity missing');
      }
      const result = await getPublishedCompanyBranch({
        client: createClient({ credentials: 'omit' }),
        path: { id: initialId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const query = useQuery({
    queryKey: ['public-company-branches', companyId, page],
    retry: false,
    queryFn: async () => {
      const result = await listPublishedCompanyBranches({
        client: createClient({ credentials: 'omit' }),
        path: { id: companyId },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const current = selected === undefined ? (initial.data ?? null) : selected;
  const valid = eligibleBranch(current, companyId, stateId) ? current : null;
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setSelected(
        query.data?.items.find(
          (branch) =>
            branch.id === event.currentTarget.value &&
            branch.companyId === companyId &&
            branch.status === 'ACTIVE' &&
            (stateId === undefined || branch.stateId === stateId),
        ) ?? null,
      );
    },
    [companyId, stateId, query.data],
  );
  return (
    <section>
      <FormField
        label={uiText(locale, 'Филиал', 'Branch')}
        htmlFor={id}
        help={uiText(
          locale,
          'Выберите действительный филиал компании. Налоговый контекст закрепляется в утверждённом корпоративном платеже; физическая территория не выводится из выбора филиала.',
          'Choose an actual company branch. Tax attribution is pinned by the approved corporate payment; selecting a branch does not establish physical territory.',
        )}
      >
        <Select id={id} name={name} required={required} value={valid?.id ?? ''} onChange={change}>
          <option value="">
            {required
              ? uiText(locale, 'Выберите филиал', 'Select a branch')
              : uiText(locale, 'Без контекста филиала', 'No branch attribution')}
          </option>
          {valid !== null && (
            <option value={valid.id}>
              {displayText(valid.name, locale)} · {displayText(valid.stateName, locale)}
            </option>
          )}
          {query.data?.items
            .filter(
              (branch) =>
                branch.id !== valid?.id &&
                branch.status === 'ACTIVE' &&
                (stateId === undefined || branch.stateId === stateId),
            )
            .map((branch) => (
              <option key={branch.id} value={branch.id}>
                {displayText(branch.name, locale)} · {displayText(branch.stateName, locale)}
              </option>
            ))}
        </Select>
      </FormField>
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка филиалов…', 'Loading branches…')}</output>
      )}
      {(query.isError || initial.isError) && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Сведения о филиале недоступны. Повторите попытку позже.',
            'Branch information unavailable. Please try again later.',
          )}
        </Alert>
      )}
      <MonetaryPagination page={page} hasMore={query.data?.hasMore ?? false} onPage={setPage} />
    </section>
  );
}
export { CompanyBranchPicker };
