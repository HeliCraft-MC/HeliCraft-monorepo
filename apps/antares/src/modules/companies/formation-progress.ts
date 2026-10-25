import { z } from '@hono/zod-openapi';
import type { Transaction } from '../permissions/transaction';
import { LegalOwnerSchema } from './contracts';
import type { CompanyDraft } from './registration-contracts';
import { liveFormationConsents } from './consents';
import { currentConsent } from './formation-context';

const FormationProgressSchema = z
  .object({
    items: z.array(
      z.object({
        owner: LegalOwnerSchema,
        role: z.enum(['FOUNDER', 'OFFICE_HOLDER']),
        confirmed: z.boolean(),
      }),
    ),
  })
  .openapi('CompanyFormationProgress');
type FormationProgress = z.infer<typeof FormationProgressSchema>;
async function formationProgress(
  transaction: Transaction,
  draft: CompanyDraft,
): Promise<FormationProgress> {
  const consents = await liveFormationConsents(transaction, draft.companyId, draft.formationHash);
  const participants: FormationProgress['items'] = draft.configuration.allocations.map(
    ({ owner }) => ({ owner, role: 'FOUNDER', confirmed: false }),
  );
  const officers = new Set(
    draft.configuration.charter.offices.flatMap((office) => office.initialHolderIds),
  );
  for (const id of officers) {
    participants.push({ owner: { type: 'PLAYER', id }, role: 'OFFICE_HOLDER', confirmed: false });
  }
  for (const participant of participants) {
    const matching = consents.filter(
      (consent) => consent.role === participant.role && consent.subjectId === participant.owner.id,
    );
    for (const consent of matching) {
      // oxlint-disable-next-line no-await-in-loop -- The progress indicator uses the same pinned evidence as actual registration.
      if (await currentConsent(transaction, consent, participant.owner)) {
        participant.confirmed = true;
      }
    }
  }
  return { items: participants };
}
export { FormationProgressSchema, formationProgress };
