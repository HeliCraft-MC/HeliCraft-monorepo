import type { LocalizedInput } from '../localized-content/contracts';
import type { CompanyDecisionPayload } from './decision-contracts';
import { mapCompanyTexts, mapOffice } from './localized-snapshot';
import type { TextTransform } from './localized-snapshot';

function mapDecisionTexts(
  payload: CompanyDecisionPayload,
  transform: TextTransform,
): CompanyDecisionPayload {
  switch (payload.kind) {
    case 'AMEND_CHARTER': {
      return { ...payload, content: mapCompanyTexts(payload.content, transform) };
    }
    case 'CREATE_OFFICE':
    case 'UPDATE_OFFICE': {
      return { ...payload, office: mapOffice(payload.office, transform) };
    }
    case 'UPDATE_PROFILE':
    case 'REGISTER_BRANCH': {
      return {
        ...payload,
        name: transform('name', payload.name),
        description: transform('description', payload.description),
      };
    }
    case 'APPOINT_OFFICE_HOLDER':
    case 'AUTHORIZE_SHARE_TRANSFER':
    case 'CLOSE_COMPANY':
    case 'CLOSE_BRANCH':
    case 'FOUND_COMPANY':
    case 'ISSUE_SHARES':
    case 'REMOVE_OFFICE_HOLDER':
    case 'TRANSFER_FUNDS':
    case 'TRANSFER_OWNED_SHARES':
    case 'VOTE_AS_SHAREHOLDER': {
      return payload;
    }
    case 'ACCEPT_SHARE_ACQUISITION':
    case 'REVOKE_SHARE_ACQUISITION': {
      return payload;
    }
    default: {
      throw new Error('Unknown corporate payload');
    }
  }
}
function extractDecisionTexts(payload: CompanyDecisionPayload): {
  machine: CompanyDecisionPayload;
  texts: Map<string, LocalizedInput>;
} {
  const texts = new Map<string, LocalizedInput>();
  const machine = mapDecisionTexts(payload, (path, values) => {
    texts.set(path, values);
    return {};
  });
  return { machine, texts };
}
export { mapDecisionTexts, extractDecisionTexts };
