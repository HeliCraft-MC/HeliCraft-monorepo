const labelKeys: Readonly<Record<string, string>> = {
  ESTABLISH_BANK: 'monetary.establishBank',
  CHANGE_CHARTER: 'monetary.changeCharter',
  CREATE_CURRENCY: 'monetary.createCurrency',
  CHANGE_POLICY: 'monetary.changePolicy',
  ISSUE: 'monetary.issueMoney',
  BURN: 'monetary.burnMoney',
  BANK_TRANSFER: 'monetary.bankTransfer',
  TREASURY_TRANSFER: 'monetary.treasuryTransfer',
  TRANSFER: 'monetary.transferMoney',
  PLAYER: 'monetary.playerAccount',
  CENTRAL_BANK: 'monetary.centralBankAccount',
  TREASURY: 'monetary.treasuryAccount',
  ISSUANCE: 'monetary.issuanceAccount',
  ACTIVE: 'monetary.statusActive',
  PENDING: 'monetary.statusPending',
  REJECTED: 'monetary.statusRejected',
  SUSPENDED: 'monetary.statusSuspended',
  BLOCKED: 'monetary.statusBlocked',
};
function monetaryLabel(text: (key: string) => string, code: string): string {
  return text(labelKeys[code] ?? `monetary.${code}`);
}
export { monetaryLabel };
