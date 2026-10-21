import type { Database } from '../../db';
import { assignmentState } from '../states/office-assignment-context';
import { stateDirectivePage } from '../monetary/directive-page';
import type { DirectiveDetail, MonetaryActor } from '../monetary/contracts';
import { monetaryActor } from '../monetary/store';

const PAGE_SIZE = 20;
const COMPANY_DIRECTIVE_KINDS = [
  'SET_COMPANY_REGISTRATION_POLICY',
  'REVIEW_COMPANY_REGISTRATION',
  'REVIEW_COMPANY_BRANCH',
  'CONSENT_COMPANY_FORMATION',
  'ACCEPT_SHARE_ACQUISITION',
  'REVOKE_SHARE_ACQUISITION',
  'TRANSFER_COMPANY_SHARES',
  'VOTE_AS_SHAREHOLDER',
] as const;
class StateCompanyReadService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async decisions(
    stateId: string,
    actor: MonetaryActor,
    page: number,
  ): Promise<{ items: DirectiveDetail[]; page: number; hasMore: boolean }> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      return {
        ...(await stateDirectivePage(transaction, {
          stateId,
          actor,
          page,
          pageSize: PAGE_SIZE,
          kinds: COMPANY_DIRECTIVE_KINDS,
        })),
        page,
      };
    });
  }
}
export { StateCompanyReadService };
