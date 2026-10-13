import type { LocalizedInput, StateDetail } from '@helicraft/alhena';

const EMPTY_FOUNDERS: StateDetail['founders'] = [];
const EMPTY_HTML: StateDetail['constitutionHtml'] = [];
const EMPTY_HOLDERS: StateDetail['holders'] = [];
const EMPTY_LOCALIZED: LocalizedInput = {};
const PREWRAP_STYLE = { whiteSpace: 'pre-wrap' } as const;
export { EMPTY_FOUNDERS, EMPTY_HTML, EMPTY_HOLDERS, EMPTY_LOCALIZED, PREWRAP_STYLE };
