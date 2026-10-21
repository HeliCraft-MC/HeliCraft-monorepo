import type {
  CompanyDecisionPayload,
  CompanyWorkspace,
  ShareOperationView,
} from '@helicraft/alhena';
import { operationRecipients, shareRecipientsConsented } from './share-view-model';

interface CompanyShareCommand {
  id: string;
  label: readonly [string, string];
  payload: CompanyDecisionPayload;
  disabled: boolean;
  createdAt?: string;
}
function shareIssuanceCommands(
  workspace: CompanyWorkspace,
  view: ShareOperationView,
): CompanyShareCommand[] {
  const commands: CompanyShareCommand[] = [];
  const { operation } = view;
  if (operation.kind === 'ISSUE') {
    if (
      operation.issuerId === workspace.id &&
      workspace.availableActions.includes('ISSUE_SHARES')
    ) {
      commands.push({
        id: 'issue',
        label: ['Проверить решение о выпуске', 'Review share issuance decision'],
        payload: { kind: 'ISSUE_SHARES', operation },
        disabled: !view.termsCurrent || !shareRecipientsConsented(view),
      });
    }
    return commands;
  }
  return commands;
}
function shareDispositionCommands(
  workspace: CompanyWorkspace,
  view: ShareOperationView,
): CompanyShareCommand[] {
  const commands: CompanyShareCommand[] = [];
  const { operation } = view;
  if (operation.kind === 'ISSUE') {
    return shareIssuanceCommands(workspace, view);
  }
  if (
    operation.issuerId === workspace.id &&
    workspace.availableActions.includes('AUTHORIZE_SHARE_TRANSFER')
  ) {
    commands.push({
      id: 'authorize',
      label: ['Проверить одобрение эмитента', 'Review issuer transfer approval'],
      payload: { kind: 'AUTHORIZE_SHARE_TRANSFER', operation },
      disabled: !view.termsCurrent,
    });
  }
  if (
    operation.owner.type === 'COMPANY' &&
    operation.owner.id === workspace.id &&
    workspace.availableActions.includes('TRANSFER_OWNED_SHARES')
  ) {
    commands.push({
      id: 'transfer',
      label: ['Проверить передачу принадлежащих акций', 'Review disposal of owned shares'],
      payload: {
        kind: 'TRANSFER_OWNED_SHARES',
        operation,
        authorizationDecisionId: view.issuerApprovalRequired
          ? view.availableIssuerApprovalDecisionId
          : null,
      },
      disabled:
        !view.termsCurrent ||
        !shareRecipientsConsented(view) ||
        (view.issuerApprovalRequired && view.availableIssuerApprovalDecisionId === null),
    });
  }
  return commands;
}
function shareConsentCommands(
  workspace: CompanyWorkspace,
  view: ShareOperationView,
): CompanyShareCommand[] {
  const commands: CompanyShareCommand[] = [];
  const receives = operationRecipients(view.operation).some(
    (owner) => owner.type === 'COMPANY' && owner.id === workspace.id,
  );
  if (receives && workspace.availableActions.includes('ACCEPT_SHARE_ACQUISITION')) {
    commands.push({
      id: 'accept',
      label: ['Проверить согласие компании на акции', 'Review corporate share acceptance'],
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation: view.operation },
      disabled: !view.termsCurrent,
    });
  }
  if (workspace.availableActions.includes('REVOKE_SHARE_ACQUISITION')) {
    for (const consent of view.consents.filter(
      (item) =>
        item.owner.type === 'COMPANY' &&
        item.owner.id === workspace.id &&
        item.revokedAt === null &&
        item.eventId === null,
    )) {
      commands.push({
        id: consent.id,
        label: ['Проверить отзыв согласия', 'Review consent revocation'],
        payload: { kind: 'REVOKE_SHARE_ACQUISITION', consentId: consent.id },
        disabled: false,
        createdAt: consent.createdAt,
      });
    }
  }
  return commands;
}
function companyShareCommands(
  workspace: CompanyWorkspace,
  view: ShareOperationView,
): CompanyShareCommand[] {
  return view.eventId === null
    ? [...shareDispositionCommands(workspace, view), ...shareConsentCommands(workspace, view)]
    : [];
}
export { companyShareCommands };
