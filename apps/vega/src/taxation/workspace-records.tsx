import { useMemo } from 'react';
import type { ReactElement, MouseEvent } from 'react';
import type { StateDetail, StateTaxation } from '@helicraft/alhena';
import { Tabs } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { DirectiveList } from '../monetary/directive-list';
import { TaxLawList } from './law-list';
import { TaxReceipts } from './receipts';

function TaxationRecords({
  data,
  state,
  actorId,
  onEdit,
  onSaved,
}: Readonly<{
  data: StateTaxation;
  state: StateDetail;
  actorId: string;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const items = useMemo(
    () => [
      {
        id: 'laws',
        label: uiText(locale, 'Законы', 'Laws'),
        content: <TaxLawList data={data} state={state} actorId={actorId} onEdit={onEdit} />,
      },
      {
        id: 'decisions',
        label: uiText(locale, 'Решения', 'Decisions'),
        content: (
          <DirectiveList
            items={data.directives}
            state={state}
            actorId={actorId}
            onSaved={onSaved}
          />
        ),
      },
      {
        id: 'receipts',
        label: uiText(locale, 'Начисления и поступления', 'Assessments and receipts'),
        content: <TaxReceipts data={data} />,
      },
    ],
    [data, state, actorId, onEdit, onSaved, locale],
  );
  return <Tabs items={items} label={uiText(locale, 'Налоговые данные', 'Tax records')} />;
}
export { TaxationRecords };
