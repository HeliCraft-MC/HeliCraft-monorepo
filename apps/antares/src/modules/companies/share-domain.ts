import { DomainError, HTTP } from '../errors';
import { monetaryHash } from '../monetary/domain';
import type { LegalOwner } from './contracts';
import type { ShareOperation } from './ownership-contracts';
import { ShareOperationSchema } from './ownership-contracts';
import { ownerKey } from './domain';

const SHARE_LIMIT = 1_000_000_000_000_000_000_000_000_000_000n;
function shareRecipients(
  operation: ShareOperation,
): readonly Readonly<{ owner: LegalOwner; shares: string }>[] {
  return operation.kind === 'ISSUE'
    ? operation.allocations
    : [{ owner: operation.recipient, shares: operation.shares }];
}
function validateShareOperation(input: ShareOperation): ShareOperation {
  const operation = ShareOperationSchema.parse(input);
  const recipients = shareRecipients(operation);
  if (
    operation.kind === 'ISSUE' &&
    (recipients.reduce((sum, allocation) => sum + BigInt(allocation.shares), 0n) !==
      BigInt(operation.shares) ||
      new Set(recipients.map((allocation) => ownerKey(allocation.owner))).size !==
        recipients.length)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_ISSUE_UNBALANCED',
      'Выпуск должен быть распределён точно и без повторяющихся получателей',
    );
  }
  if (
    operation.kind === 'TRANSFER' &&
    ownerKey(operation.owner) === ownerKey(operation.recipient)
  ) {
    throw new DomainError(HTTP.conflict, 'SAME_SHARE_OWNER', 'Выберите другого получателя акций');
  }
  if (
    recipients.some(
      (allocation) =>
        allocation.owner.type === 'COMPANY' && allocation.owner.id === operation.issuerId,
    )
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_OWNERSHIP_CYCLE',
      'Компания не может владеть собственными акциями',
    );
  }
  return operation;
}
function assertShareSupply(issuedShares: string, operation: ShareOperation): void {
  if (
    operation.kind === 'ISSUE' &&
    BigInt(issuedShares) + BigInt(operation.shares) >= SHARE_LIMIT
  ) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_SUPPLY_LIMIT',
      'Количество акций превышает технический предел точного учёта',
    );
  }
}
function shareCommandHash(
  operation: ShareOperation,
  authorizationDecisionId: string | null,
): string {
  return monetaryHash({ operation, authorizationDecisionId });
}
function shareTermsHash(operation: ShareOperation): string {
  return monetaryHash(operation);
}
function controlsCompany(shares: string, totalShares: string): boolean {
  return BigInt(totalShares) > 0n && BigInt(shares) * 2n > BigInt(totalShares);
}
export {
  shareRecipients,
  validateShareOperation,
  assertShareSupply,
  shareCommandHash,
  shareTermsHash,
  controlsCompany,
};
