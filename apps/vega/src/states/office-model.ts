import type { StateOffice } from '@helicraft/alhena';

function newOffice(): StateOffice {
  return {
    id: crypto.randomUUID(),
    name: {},
    description: {},
    isHeadOfState: false,
    maxHolders: 1,
    required: false,
    initialHolderIds: [],
    appointment: 'MANUAL_PROCEDURE',
    appointingOfficeId: null,
    term: 'INDEFINITE',
    termDays: null,
    vacancy: 'MANUAL',
    inactivityDays: null,
  };
}
export { newOffice };
