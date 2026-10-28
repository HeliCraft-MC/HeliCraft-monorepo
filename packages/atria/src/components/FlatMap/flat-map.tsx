import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { FlatMapProps } from './model';
import type { FlatMapRuntime } from './runtime';
import { MapStatus } from './map-status';
import styles from './flat-map.module.scss';
import { loadRuntime } from './load-runtime';

// Browser-only Leaflet implementation; server rendering retains an accessible loading surface.
function FlatMap(props: FlatMapProps): ReactElement {
  const container = useRef<HTMLElement>(null);
  const runtime = useRef<FlatMapRuntime | null>(null);
  const latest = useRef(props);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    latest.current = props;
    runtime.current?.update(props);
  }, [props]);
  useEffect(() => {
    let disposed = false;
    async function mount(): Promise<void> {
      try {
        const { createFlatMap } = await loadRuntime();
        if (!disposed && container.current) {
          runtime.current = createFlatMap(container.current, latest.current, setTileError);
          setStatus('ready');
        }
      } catch {
        if (!disposed) {
          setStatus('error');
        }
      }
    }
    void mount();
    return (): void => {
      disposed = true;
      runtime.current?.destroy();
      runtime.current = null;
    };
  }, []);
  return (
    <div className={styles.frame}>
      <section
        ref={container}
        className={styles.map}
        aria-label={props.label}
        aria-busy={status === 'loading'}
      />
      <MapStatus status={status} tileError={tileError} labels={props} />
    </div>
  );
}
export { FlatMap };
export type {
  FlatMapProps,
  FlatGeometry,
  FlatPoint,
  FlatMapShape,
  FlatMapMode,
  FlatMapBounds,
} from './model';
