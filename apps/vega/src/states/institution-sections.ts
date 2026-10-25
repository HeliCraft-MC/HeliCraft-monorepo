const INSTITUTION_SECTIONS = [
  'bank',
  'currency',
  'monetary-policy',
  'issuance',
  'bank-finances',
  'treasury',
  'taxation',
  'fx',
  'companies',
] as const;
type InstitutionSection = (typeof INSTITUTION_SECTIONS)[number];
function isInstitutionSection(value: string): value is InstitutionSection {
  return INSTITUTION_SECTIONS.some((section) => section === value);
}
export { INSTITUTION_SECTIONS, isInstitutionSection, type InstitutionSection };
