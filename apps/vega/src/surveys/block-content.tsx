import type { ReactElement } from 'react';
import type { SurveyAnswer, SurveyBlock, VotingDetail, VotingInput } from '@helicraft/alhena';
import { MarkdownContent } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { SurveyImages } from './images';
import { SurveyQuestion } from './question';
import styles from './survey.module.scss';

function SurveyBlockContent({
  block,
  input,
  value,
  onChange,
  html,
}: Readonly<{
  block: SurveyBlock;
  input: VotingInput;
  value: SurveyAnswer['value'];
  onChange: (id: string, value: SurveyAnswer['value']) => void;
  html?: VotingDetail['surveyHtml'];
}>): ReactElement {
  const { locale } = useTranslation();
  if (block.type === 'IMAGE_BLOCK') {
    return <SurveyImages block={block} />;
  }
  if (block.type === 'TEXT_BLOCK') {
    const rendered = html?.find((item) => item.id === block.id);
    return (
      <div className={styles.decoration} data-style={block.style}>
        {rendered ? (
          <MarkdownContent html={displayText(rendered.html, locale)} />
        ) : (
          <div className={styles.text}>{displayText(block.content, locale)}</div>
        )}
      </div>
    );
  }
  return <SurveyQuestion input={input} block={block} value={value} onChange={onChange} />;
}
export { SurveyBlockContent };
