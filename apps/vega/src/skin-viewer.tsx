import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { SkinViewer } from 'skinview3d';
import styles from './account.module.scss';

interface SkinViewerProps {
  readonly url: string;
  readonly model: 'CLASSIC' | 'SLIM';
}
export function SkinPreview({ url, model }: SkinViewerProps): ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect((): (() => void) | undefined => {
    if (!canvas.current) {
      return undefined;
    }
    let viewer: SkinViewer | null = null;
    try {
      viewer = new SkinViewer({ canvas: canvas.current, width: 300, height: 360 });
      const current = viewer;
      const load = async (): Promise<void> => {
        try {
          await current.loadSkin(url, { model: model === 'SLIM' ? 'slim' : 'default' });
        } catch {
          setFailed(true);
        }
      };
      void load();
      current.autoRotate = !globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
      current.controls.enableZoom = false;
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect -- WebGL construction is an external resource operation; its actual failure must produce a visible fallback.
      setFailed(true);
    }
    return (): void => {
      viewer?.dispose();
    };
  }, [url, model]);
  return (
    <div className={styles.preview}>
      {failed ? (
        <>
          <img src={url} alt="Текстура скина — 3D-просмотр недоступен" width={256} height={256} />
          <p>WebGL недоступен. Скин можно сохранить по текстуре.</p>
        </>
      ) : (
        <canvas ref={canvas} aria-label="3D-просмотр скина: перетаскивайте для вращения" />
      )}
    </div>
  );
}
