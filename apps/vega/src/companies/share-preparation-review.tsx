import type { ReactElement } from 'react';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { ShareOperationSummary } from './share-operation-summary';
import type { useSharePreparation } from './use-share-preparation';

function SharePreparationReview({
  preparation,
}: Readonly<{ preparation: ReturnType<typeof useSharePreparation> }>): ReactElement {
  const { locale } = useTranslation();
  const { review, confirm, changeOpen } = preparation;
  return (
    <>
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Проверьте условия операции с акциями', 'Review exact share terms')}
        description={uiText(
          locale,
          'Подготовка фиксирует предложение, но не меняет собственность. Получатели должны согласиться; передача или выпуск потребуют отдельного исполнения.',
          'Preparation freezes a proposal and does not change ownership. Recipients must consent; transfer or issuance requires separate execution.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && <ShareOperationSummary operation={review.operation} />}
        <Button onClick={confirm} disabled={preparation.pending}>
          {uiText(locale, 'Зафиксировать предложение', 'Prepare immutable proposal')}
        </Button>
        {preparation.error !== null && (
          <Alert tone="danger">{errorMessage(preparation.error)}</Alert>
        )}
      </Dialog>
      {preparation.savedId !== null && (
        <Alert tone="success">
          <a href={`/app/share-operations/${preparation.savedId}`}>
            {uiText(
              locale,
              'Предложение сохранено. Открыть согласия и исполнение',
              'Share proposal saved. View consent and execution',
            )}
          </a>
        </Alert>
      )}
    </>
  );
}
export { SharePreparationReview };
