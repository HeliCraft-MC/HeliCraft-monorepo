import type { StateConfiguration } from './contracts';
import type { LocalizedInput } from '../localized-content/contracts';

// One traversal owns the normalized paths for every display field in this domain.
function mapTexts(
  configuration: Readonly<StateConfiguration>,
  transform: (path: string, values: LocalizedInput) => LocalizedInput,
): StateConfiguration {
  return {
    ...configuration,
    name: transform('name', configuration.name),
    description: transform('description', configuration.description),
    governance: {
      ...configuration.governance,
      offices: configuration.governance.offices.map((office) => ({
        ...office,
        name: transform(`office.${office.id}.name`, office.name),
        description: transform(`office.${office.id}.description`, office.description),
      })),
      policies: configuration.governance.policies.map((policy) => ({
        ...policy,
        manualProcedure: transform(`policy.${policy.action}.manual`, policy.manualProcedure),
      })),
    },
    constitution: configuration.constitution
      ? {
          title: transform('constitution.title', configuration.constitution.title),
          blocks: configuration.constitution.blocks.map((block) =>
            block.type === 'MARKDOWN'
              ? { ...block, content: transform(`block.${block.id}`, block.content) }
              : block,
          ),
        }
      : null,
  };
}
function extractTexts(configuration: Readonly<StateConfiguration>): {
  machine: StateConfiguration;
  texts: Map<string, LocalizedInput>;
} {
  const texts = new Map<string, LocalizedInput>();
  const machine = mapTexts(configuration, (path, values) => {
    texts.set(path, values);
    return {};
  });
  return { machine, texts };
}
function hydrateTexts(
  configuration: Readonly<StateConfiguration>,
  texts: ReadonlyMap<string, LocalizedInput>,
): StateConfiguration {
  return mapTexts(configuration, (path) => texts.get(path) ?? {});
}
export { extractTexts, hydrateTexts };
