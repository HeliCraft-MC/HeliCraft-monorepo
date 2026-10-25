import type { ReactElement } from 'react';
import type { CompanyDraft } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyFormationProgress } from './formation-progress';
import { FormationConsent } from './formation-consent';
import { EntityFormationConsents } from './entity-formation-consents';

function CompanyFormationConsents({
  draft,
  actorId,
}: Readonly<{ draft: CompanyDraft; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const founder = draft.configuration.allocations.some(
    (allocation) => allocation.owner.type === 'PLAYER' && allocation.owner.id === actorId,
  );
  const officer = draft.configuration.charter.offices.some((office) =>
    office.initialHolderIds.includes(actorId),
  );
  return (
    <section>
      <h3>{uiText(locale, 'Согласия участников', 'Participant consents')}</h3>
      <FieldHelp
        showLabel
        label={uiText(locale, 'Неизменяемые условия согласия', 'Exact formation consent')}
        content={uiText(
          locale,
          'Согласие относится к сохранённому проекту. Изменение названия, акций, должностей или управления потребует новых согласий. Поделитесь ссылкой на этот черновик с выбранными участниками; прочитать его смогут только участники.',
          'Consent covers the saved draft. Changes to identity, shares, offices or governance require fresh consent. Share this draft link with selected participants; only participants can read it.',
        )}
      />
      <CompanyFormationProgress draft={draft} />
      <a href="/app/notifications">
        {uiText(
          locale,
          'Участники найдут свои запросы во «Входящих»',
          'Participants can find their requests in the approval inbox',
        )}
      </a>
      <EntityFormationConsents draft={draft} />
      {founder && (
        <FormationConsent
          key={`founder-${draft.formationHash}`}
          draft={draft}
          consentRole="FOUNDER"
        />
      )}
      {officer && (
        <FormationConsent
          key={`officer-${draft.formationHash}`}
          draft={draft}
          consentRole="OFFICE_HOLDER"
        />
      )}
      <a href={`/app/companies/drafts/${draft.id}`}>
        {uiText(locale, 'Ссылка для участников', 'Participant review link')}
      </a>
    </section>
  );
}
export { CompanyFormationConsents };
