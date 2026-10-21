import type { LocalizedInput } from '../localized-content/contracts';
import type { CompanyOffice, CompanyProcedure, CompanyRevisionContent } from './contracts';

type TextTransform = (path: string, values: LocalizedInput) => LocalizedInput;
function mapProcedure(
  procedure: CompanyProcedure,
  path: string,
  transform: TextTransform,
): CompanyProcedure {
  return { ...procedure, manualProcedure: transform(`${path}.manual`, procedure.manualProcedure) };
}
function mapOffice(office: CompanyOffice, transform: TextTransform): CompanyOffice {
  const path = `office.${office.id}`;
  return {
    ...office,
    name: transform(`${path}.name`, office.name),
    description: transform(`${path}.description`, office.description),
    appointment: mapProcedure(office.appointment, `${path}.appointment`, transform),
    removal: mapProcedure(office.removal, `${path}.removal`, transform),
  };
}
function mapCompanyTexts(
  content: CompanyRevisionContent,
  transform: TextTransform,
): CompanyRevisionContent {
  return {
    ...content,
    name: transform('name', content.name),
    description: transform('description', content.description),
    document: transform('document', content.document),
    charter: {
      ...content.charter,
      offices: content.charter.offices.map((office) => mapOffice(office, transform)),
      policies: content.charter.policies.map((policy) => ({
        ...policy,
        procedure: mapProcedure(policy.procedure, `policy.${policy.action}`, transform),
        financialBands: policy.financialBands.map((band) => ({
          ...band,
          procedure: mapProcedure(
            band.procedure,
            `policy.${policy.action}.band.${band.currencyId}.${band.upToMinor}`,
            transform,
          ),
        })),
      })),
    },
  };
}
function extractCompanyTexts(content: CompanyRevisionContent): {
  machine: CompanyRevisionContent;
  texts: Map<string, LocalizedInput>;
} {
  const texts = new Map<string, LocalizedInput>();
  const machine = mapCompanyTexts(content, (path, values) => {
    texts.set(path, values);
    return {};
  });
  return { machine, texts };
}
function hydrateCompanyTexts(
  content: CompanyRevisionContent,
  texts: ReadonlyMap<string, LocalizedInput>,
): CompanyRevisionContent {
  return mapCompanyTexts(content, (path) => texts.get(path) ?? {});
}
export { mapCompanyTexts, mapOffice, extractCompanyTexts, hydrateCompanyTexts, type TextTransform };
