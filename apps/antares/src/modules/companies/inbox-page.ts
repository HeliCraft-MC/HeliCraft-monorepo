import type { CompanyInboxItem, CompanyInboxPage } from './inbox-contracts';

const INBOX_SCAN_SIZE = 50;
const LAST_ROW = -1;
function inboxPage(rows: readonly { id: string }[], items: CompanyInboxItem[]): CompanyInboxPage {
  return {
    items,
    nextId: rows.length === INBOX_SCAN_SIZE ? (rows.at(LAST_ROW)?.id ?? null) : null,
  };
}
export { INBOX_SCAN_SIZE, inboxPage };
