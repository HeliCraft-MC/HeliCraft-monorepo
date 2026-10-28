import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import type { FlatPoint } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { COORDINATE_PRECISION } from './model';
import { Copy } from 'lucide-react';
import styles from './spatial.module.scss';

function CoordinateReadout({ point }: Readonly<{ point: FlatPoint | null }>): ReactElement | null {
  const { locale } = useTranslation();
  const [copied, setCopied] = useState('');
  const [failed, setFailed] = useState(false);
  const value = point
    ? `X ${point[0].toFixed(COORDINATE_PRECISION)} · Z ${point[1].toFixed(COORDINATE_PRECISION)}`
    : '';
  const copy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [value]);
  const handleCopy = useCallback((): void => {
    void copy();
  }, [copy]);
  if (!point) {
    return null;
  }
  return (
    <div className={styles.coordinateReadout}>
      <output className={styles.coordinateValue}>{value}</output>
      <Button
        tone="quiet"
        onClick={handleCopy}
        aria-label={uiText(locale, 'Копировать координаты', 'Copy coordinates')}
      >
        <Copy size={15} aria-hidden="true" />
      </Button>
      <output aria-live="polite">
        {copied === value ? uiText(locale, 'Скопировано.', 'Copied.') : ''}
        {failed
          ? uiText(
              locale,
              'Выделите координаты и скопируйте вручную.',
              'Select the coordinates and copy them manually.',
            )
          : ''}
      </output>
    </div>
  );
}
export { CoordinateReadout };
