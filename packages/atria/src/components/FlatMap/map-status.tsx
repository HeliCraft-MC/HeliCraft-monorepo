import type { ReactElement } from 'react';
import { Navigation } from 'lucide-react';
import { LoadingState } from '../LoadingState/loading-state';
import type { FlatMapProps } from './model';
import styles from './flat-map.module.scss';

type MapStatusValue = 'loading' | 'ready' | 'error';
function MapStatus({
  status,
  tileError,
  labels,
}: Readonly<{ status: MapStatusValue; tileError: boolean; labels: FlatMapProps }>): ReactElement {
  return (
    <>
      {status === 'ready' && (
        <div className={styles.compass} aria-hidden="true">
          <span>{labels.locale === 'ru' ? 'С' : 'N'}</span>
          <Navigation size={18} />
          <small>−Z</small>
        </div>
      )}
      {status === 'loading' && (
        <div className={styles.overlay}>
          <LoadingState label={labels.loadingLabel} />
        </div>
      )}
      {status === 'error' && (
        <div className={styles.overlay}>
          <p role="alert">{labels.errorLabel}</p>
        </div>
      )}
      {status === 'ready' && tileError && labels.showTiles !== false && (
        <output className={styles.tileWarning}>{labels.tileErrorLabel}</output>
      )}
    </>
  );
}
export { MapStatus, type MapStatusValue };
