import type { CompanyConfiguration } from './contracts';

function draftParticipant(
  record: Readonly<{ ownerId: string; configuration: CompanyConfiguration }>,
  actorId: string,
): boolean {
  return (
    record.ownerId === actorId ||
    record.configuration.allocations.some(
      (allocation) => allocation.owner.type === 'PLAYER' && allocation.owner.id === actorId,
    ) ||
    record.configuration.charter.offices.some((office) => office.initialHolderIds.includes(actorId))
  );
}
export { draftParticipant };
