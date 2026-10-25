import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { CompanyConfiguration, CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button, FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyAllocationsEditor } from './allocations-editor';
import { useSharePreparation } from './use-share-preparation';
import { SharePreparationReview } from './share-preparation-review';

function ShareIssueComposer({
  workspace,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [configuration, setConfiguration] = useState<CompanyConfiguration>(() => ({
    ...workspace.content,
    registrationStateId: workspace.registrationStateId,
    totalShares: '1',
    allocations: [],
  }));
  const [problem, setProblem] = useState('');
  const preparation = useSharePreparation(onSaved);
  const { prepare } = preparation;
  const review = useCallback((): void => {
    if (
      !/^[1-9][0-9]{0,29}$/u.test(configuration.totalShares) ||
      configuration.allocations.some(
        (allocation) => !/^[1-9][0-9]{0,29}$/u.test(allocation.shares),
      ) ||
      configuration.allocations.reduce((sum, item) => sum + BigInt(item.shares), 0n) !==
        BigInt(configuration.totalShares)
    ) {
      setProblem(
        uiText(
          locale,
          'Распределите точное положительное количество новых акций.',
          'Allocate the exact positive quantity of new shares.',
        ),
      );
      return;
    }
    prepare({
      kind: 'ISSUE',
      operationId: crypto.randomUUID(),
      issuerId: workspace.id,
      issuerRevisionId: workspace.currentRevisionId,
      shares: configuration.totalShares,
      allocations: configuration.allocations,
    });
    setProblem('');
  }, [configuration, workspace.id, workspace.currentRevisionId, prepare, locale]);
  return (
    <section>
      <h3>{uiText(locale, 'Дополнительный выпуск акций', 'Additional share issuance')}</h3>
      <FieldHelp
        showLabel
        label={uiText(locale, 'Размытие долей', 'Dilution')}
        content={uiText(
          locale,
          'Новый выпуск увеличивает общий капитал и изменяет доли действующих собственников. Денежные средства не возникают из выпуска. Каждый получатель отдельно соглашается на точные условия.',
          'Issuance increases total shares and changes existing ownership percentages. It does not create money. Each recipient separately consents to the exact terms.',
        )}
      />
      <CompanyAllocationsEditor mode="ISSUE" value={configuration} onChange={setConfiguration} />
      <Button onClick={review}>
        {uiText(locale, 'Проверить предложение выпуска', 'Review issuance proposal')}
      </Button>
      {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      <SharePreparationReview preparation={preparation} />
    </section>
  );
}
export { ShareIssueComposer };
