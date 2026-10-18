import { uiText, displayText } from './text';
import { EMPTY_FOUNDERS, EMPTY_HTML, PREWRAP_STYLE } from './empty';
import { GeneratedBlock } from './generated-block';
import type { ReactElement } from 'react';
import type { StateConfiguration, StateDetail } from '@helicraft/alhena';
import { EntityMarkdown } from '../entity-markdown';
import { useTranslation } from '../i18n';
import { GovernmentSummary } from './government';

import styles from './states.module.scss';

function ConstitutionDocument({
  configuration,
  html = EMPTY_HTML,
  founders = EMPTY_FOUNDERS,
  showGovernanceWhenAbsent = true,
}: Readonly<{
  configuration: StateConfiguration;
  html?: StateDetail['constitutionHtml'];
  founders?: StateDetail['founders'];
  showGovernanceWhenAbsent?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  if (!configuration.constitution) {
    return (
      <section>
        <p>
          {uiText(
            locale,
            'У государства нет формального конституционного документа.',
            'This state has no formal constitution document.',
          )}
        </p>
        {showGovernanceWhenAbsent && (
          <GovernmentSummary configuration={configuration} founders={founders} />
        )}
      </section>
    );
  }
  function renderBlock(
    block: NonNullable<StateConfiguration['constitution']>['blocks'][number],
  ): ReactElement {
    const rendered = html.find((item) => item.id === block.id);
    if (rendered) {
      return <EntityMarkdown html={rendered.html} />;
    }
    if (block.type === 'GENERATED') {
      return <GeneratedBlock block={block} configuration={configuration} founders={founders} />;
    }
    return <p style={PREWRAP_STYLE}>{displayText(block.content, locale)}</p>;
  }
  return (
    <article className={styles.document}>
      <h2>{displayText(configuration.constitution.title, locale)}</h2>
      {configuration.constitution.blocks.map((block) => (
        <section key={block.id} className={styles.documentBlock}>
          {renderBlock(block)}
        </section>
      ))}
    </article>
  );
}

export { ConstitutionDocument };
