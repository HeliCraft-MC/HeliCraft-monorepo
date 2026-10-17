import formStyles from './form.module.scss';
// oxlint-disable import/max-dependencies -- Wizard composition reuses localized inputs, existing REST state selection and shared form controls.
import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createTreatyDraft, editTreatyDraft } from '@helicraft/alhena';
import type { LocalizedInput, Treaty, TreatyContent } from '@helicraft/alhena';
import { Alert, Button, FieldHelp } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { formText } from '../monetary/model';
import { TreatyPartner } from './partner';
import { TreatyTerms } from './terms';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;
const BASIS_POINTS = 10_000;

const STEPS = { PARTNER: 1, IDENTITY: 2, TERMS: 3, REVIEW: 4 };
// oxlint-disable-next-line max-lines-per-function, complexity -- Four labelled wizard steps preserve localized form state and a review; treaty validation and authority stay on the server.
function TreatyWizard({
  stateId,
  treaty,
  onSaved,
}: Readonly<{ stateId: string; treaty?: Treaty; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const original = treaty?.revisions.find((revision) => revision.id === treaty.currentRevisionId);
  const firstParty = treaty?.parties[0];
  const secondParty = treaty?.parties[1];
  const firstLabel =
    firstParty === undefined
      ? uiText(locale, 'Наше государство', 'Our state')
      : displayText(firstParty.name, locale);
  const secondLabel =
    secondParty === undefined
      ? uiText(locale, 'Выбранный партнёр', 'Selected partner')
      : displayText(secondParty.name, locale);
  const [step, setStep] = useState(treaty === undefined ? STEPS.PARTNER : STEPS.IDENTITY);
  const [partner, setPartner] = useState(
    treaty?.parties.find((party) => party.id !== stateId)?.id ?? '',
  );
  const [name, setName] = useState<LocalizedInput>(original?.content.name ?? {});
  const [description, setDescription] = useState<LocalizedInput>(
    original?.content.description ?? {},
  );
  const [document, setDocument] = useState<LocalizedInput>(original?.content.document ?? {});
  const [content, setContent] = useState<TreatyContent | undefined>(original?.content);
  const taxingStateLabel =
    content?.terms.mode === 'EXCLUSIVE' &&
    content.terms.taxingStateId === (firstParty?.id ?? stateId)
      ? firstLabel
      : secondLabel;
  const [problem, setProblem] = useState('');
  const mutation = useMutation({
    mutationFn: async () => {
      if (content === undefined) {
        throw new Error('Review the terms');
      }
      // oxlint-disable-next-line unicorn/prefer-ternary -- Distinct create/update API calls keep revision matching explicit.
      if (treaty !== undefined && original !== undefined) {
        await editTreatyDraft({
          client: browserClient(),
          path: { stateId, id: treaty.id },
          body: { baseRevisionId: original.id, content },
          throwOnError: true,
        });
      } else {
        await createTreatyDraft({
          client: browserClient(),
          path: { stateId },
          body: { partnerStateId: partner, content },
          throwOnError: true,
        });
      }
    },
    onSuccess: onSaved,
  });
  const { mutate } = mutation;
  const save = useCallback((): void => {
    mutate();
  }, [mutate]);
  const back = useCallback((): void => {
    setStep((current) => Math.max(1, current - 1));
  }, []);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      if (step !== STEPS.TERMS) {
        setStep((current) => current + 1);
        return;
      }
      try {
        const form = new FormData(event.currentTarget);
        const expiresAt = formText(form, 'expiresAt');
        setContent({
          name,
          description,
          document,
          type: 'TAX_TREATY',
          event: 'PLAYER_TRANSFER',
          category: formText(form, 'category'),
          taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
          terms:
            formText(form, 'mode') === 'SHARED'
              ? {
                  mode: 'SHARED',
                  rateBps: Number(formText(form, 'rateBps')),
                  firstShareBps: Number(formText(form, 'firstShareBps')),
                }
              : { mode: 'EXCLUSIVE', taxingStateId: formText(form, 'taxingStateId') },
          effectiveAt: new Date(formText(form, 'effectiveAt')).toISOString(),
          expiresAt: expiresAt === '' ? null : new Date(expiresAt).toISOString(),
          termination: 'BILATERAL',
        });
        setProblem('');
        setStep(STEPS.REVIEW);
      } catch {
        setProblem(uiText(locale, 'Проверьте даты и условия.', 'Check dates and terms.'));
      }
    },
    [step, name, description, document, locale],
  );
  return (
    <section className={styles.card}>
      <h3>{uiText(locale, 'Проект международного договора', 'International treaty draft')}</h3>
      <p>
        {uiText(locale, 'Шаг', 'Step')} {step}/4{' '}
        <FieldHelp
          label={uiText(locale, 'Ратификация', 'Ratification')}
          content={uiText(
            locale,
            'Сохранение проекта не меняет налогов. Отправьте неизменяемую редакцию партнёру, затем обе стороны утверждают её по своим правилам принятия решений.',
            'Saving a draft does not change taxation. Send its immutable revision to your partner, then both states ratify under their own Governance.',
          )}
        />
      </p>
      <form className={styles.form} onSubmit={submit}>
        {step === STEPS.PARTNER && (
          <TreatyPartner stateId={stateId} value={partner} onChange={setPartner} />
        )}
        {step === STEPS.IDENTITY && (
          <fieldset className={formStyles.step}>
            <legend>{uiText(locale, '2. Тип и текст договора', '2. Treaty type and text')}</legend>
            <p>
              {uiText(
                locale,
                'Налоговое соглашение · личные переводы',
                'Tax treaty · personal transfers',
              )}
            </p>
            <LocalizedInputField
              label={uiText(locale, 'Название договора', 'Treaty name')}
              value={name}
              onChange={setName}
            />
            <LocalizedInputField
              label={uiText(locale, 'Описание договора', 'Treaty description')}
              multiline
              value={description}
              onChange={setDescription}
            />
            <LocalizedInputField
              label={uiText(locale, 'Документ договора (Markdown)', 'Treaty document (Markdown)')}
              multiline
              value={document}
              onChange={setDocument}
            />
          </fieldset>
        )}
        {step === STEPS.TERMS && (
          <TreatyTerms
            stateId={firstParty?.id ?? stateId}
            partnerId={secondParty?.id ?? partner}
            firstLabel={firstLabel}
            secondLabel={secondLabel}
            content={content}
          />
        )}
        {step < STEPS.REVIEW && (
          <Button type="submit" disabled={step === STEPS.PARTNER && partner === ''}>
            {uiText(locale, 'Далее', 'Next')}
          </Button>
        )}
      </form>
      {step === STEPS.REVIEW && content !== undefined && (
        <>
          <h4>{displayText(content.name, locale)}</h4>
          <p>{displayText(content.description, locale)}</p>
          <p>
            {content.category} ·{' '}
            {content.terms.mode === 'SHARED'
              ? uiText(locale, 'Общая ставка с распределением', 'Shared tax rate')
              : uiText(locale, 'Исключительное право', 'Exclusive taxation')}{' '}
            · {content.effectiveAt}
          </p>
          <p>
            {content.terms.mode === 'SHARED'
              ? `${content.terms.rateBps / PERCENT_BPS}% · ${content.terms.firstShareBps / PERCENT_BPS}% / ${(BASIS_POINTS - content.terms.firstShareBps) / PERCENT_BPS}%`
              : taxingStateLabel}
          </p>
          <p>
            {uiText(
              locale,
              'Прежние подписи не подтверждают новую редакцию.',
              'Previous signatures do not approve a new revision.',
            )}
          </p>
          <Button onClick={save} disabled={mutation.isPending}>
            {uiText(locale, 'Сохранить проект', 'Save draft')}
          </Button>
        </>
      )}
      {step > 1 && (
        <Button tone="quiet" onClick={back}>
          {uiText(locale, 'Назад', 'Back')}
        </Button>
      )}
      {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </section>
  );
}
export { TreatyWizard };
