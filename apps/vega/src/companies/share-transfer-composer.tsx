import { useCallback, useId, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type { CompanySharePosition, LegalOwner } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyOwnerPicker } from './owner-picker';
import { useSharePreparation } from './use-share-preparation';
import { SharePreparationReview } from './share-preparation-review';

function ShareTransferComposer({
  position,
  owner,
  onSaved,
}: Readonly<{
  position: CompanySharePosition;
  owner: LegalOwner;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [recipient, setRecipient] = useState<LegalOwner | null>(null);
  const [type, setType] = useState<LegalOwner['type']>('PLAYER');
  const [problem, setProblem] = useState('');
  const preparation = useSharePreparation(onSaved);
  const { prepare } = preparation;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const shares = new FormData(event.currentTarget).get('shares');
      if (
        recipient === null ||
        typeof shares !== 'string' ||
        !/^[1-9][0-9]{0,29}$/u.test(shares) ||
        BigInt(shares) > BigInt(position.shares)
      ) {
        setProblem(
          uiText(
            locale,
            'Выберите получателя и доступное положительное целое количество акций.',
            'Choose a recipient and an available positive whole share quantity.',
          ),
        );
        return;
      }
      prepare({
        kind: 'TRANSFER',
        operationId: crypto.randomUUID(),
        issuerId: position.issuerId,
        issuerRevisionId: position.issuerRevisionId,
        owner,
        recipient,
        shares,
      });
      setProblem('');
    },
    [recipient, position, owner, prepare, locale],
  );
  return (
    <section>
      <h3>
        {uiText(locale, 'Передать долю', 'Transfer shares')} · {displayText(position.name, locale)}
      </h3>
      <p>
        {uiText(locale, 'Доступно акций', 'Available shares')}: {position.shares}
      </p>
      <form onSubmit={submit}>
        <CompanyOwnerPicker
          purpose="RECIPIENT"
          value={recipient}
          type={type}
          onType={setType}
          onChange={setRecipient}
        />
        <FormField label={uiText(locale, 'Передаваемые акции', 'Shares to transfer')} htmlFor={id}>
          <TextField
            id={id}
            name="shares"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            maxLength={30}
            required
          />
        </FormField>
        <Button
          type="submit"
          disabled={recipient === null || preparation.pending || position.status !== 'ACTIVE'}
        >
          {uiText(locale, 'Проверить передачу акций', 'Review share transfer')}
        </Button>
      </form>
      {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      <SharePreparationReview preparation={preparation} />
    </section>
  );
}
export { ShareTransferComposer };
