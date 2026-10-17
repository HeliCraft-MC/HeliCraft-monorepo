import { useState, useMemo, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { SurveyBlock } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from './survey.module.scss';

const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))' };
function SurveyImages({ block }: Readonly<{ block: SurveyBlock }>): ReactElement {
  const { locale } = useTranslation();
  const [index, setIndex] = useState(0);
  const [random, setRandom] = useState(() => Math.random());
  const shuffle = useCallback((): void => {
    setRandom(Math.random());
  }, []);
  const images = useMemo(() => {
    if (block.displayMode === 'RANDOM') {
      const image = block.images[Math.floor(random * block.images.length)];
      return image ? [image] : [];
    }
    if (block.displayMode === 'CAROUSEL') {
      const image = block.images[index % block.images.length];
      return image ? [image] : [];
    }
    return block.images;
  }, [block.displayMode, block.images, index, random]);
  const next = useCallback((): void => {
    setIndex((current) => (current + 1) % block.images.length);
  }, [block.images.length]);
  const previous = useCallback((): void => {
    setIndex((current) => (current + block.images.length - 1) % block.images.length);
  }, [block.images.length]);
  return (
    <div className={styles.images} style={block.displayMode === 'GRID' ? GRID_STYLE : undefined}>
      {images.map((image) => (
        <figure key={image.id}>
          <img
            src={`/api/v1/public/gallery/${image.id}/image`}
            alt={displayText(image.caption, locale)}
            loading="lazy"
          />
          {block.showCaptions && <figcaption>{displayText(image.caption, locale)}</figcaption>}
        </figure>
      ))}
      {block.displayMode === 'RANDOM' && block.images.length > 1 && (
        <Button tone="quiet" onClick={shuffle}>
          {uiText(locale, 'Другое случайное изображение', 'Another random image')}
        </Button>
      )}
      {block.displayMode === 'CAROUSEL' && block.images.length > 1 && (
        <div className={styles.toolbar}>
          <Button tone="quiet" onClick={previous}>
            {uiText(locale, 'Предыдущее изображение', 'Previous image')}
          </Button>
          <span>
            {index + 1}/{block.images.length}
          </span>
          <Button tone="quiet" onClick={next}>
            {uiText(locale, 'Следующее изображение', 'Next image')}
          </Button>
        </div>
      )}
    </div>
  );
}
export { SurveyImages };
