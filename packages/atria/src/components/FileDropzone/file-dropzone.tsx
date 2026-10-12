import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactElement, RefObject } from 'react';
import styles from './file-dropzone.module.scss';

interface FileDropzoneProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly accept: string;
  readonly file: File | null;
  readonly disabled?: boolean;
  readonly onChoose: (file: File | null) => void;
}

interface DropzoneControls {
  readonly input: RefObject<HTMLInputElement | null>;
  readonly dragging: boolean;
  readonly open: () => void;
  readonly change: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly over: (event: DragEvent<HTMLDivElement>) => void;
  readonly leave: () => void;
  readonly drop: (event: DragEvent<HTMLDivElement>) => void;
}
function useFileDropzone({
  disabled = false,
  onChoose,
}: Pick<FileDropzoneProps, 'disabled' | 'onChoose'>): DropzoneControls {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const open = useCallback((): void => {
    input.current?.click();
  }, []);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const selected = event.currentTarget.files?.[0];
      if (selected) {
        onChoose(selected);
      }
      event.currentTarget.value = '';
    },
    [onChoose],
  );
  const over = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      if (!disabled) {
        setDragging(true);
      }
    },
    [disabled],
  );
  const leave = useCallback((): void => {
    setDragging(false);
  }, []);
  const drop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setDragging(false);
      const [selected] = event.dataTransfer.files;
      if (!disabled && selected) {
        onChoose(selected);
      }
    },
    [disabled, onChoose],
  );
  return { input, dragging, open, change, over, leave, drop };
}
function FileDropzone({
  id,
  label,
  hint,
  accept,
  file,
  disabled = false,
  onChoose,
}: FileDropzoneProps): ReactElement {
  const { input, dragging, open, change, over, leave, drop } = useFileDropzone({
    disabled,
    onChoose,
  });
  return (
    <div
      className={styles.zone}
      data-dragging={dragging}
      data-disabled={disabled}
      onDragOver={over}
      onDragLeave={leave}
      onDrop={drop}
    >
      <input
        ref={input}
        id={id}
        hidden
        tabIndex={-1}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={label}
        onChange={change}
      />
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        onClick={open}
        aria-describedby={`${id}-hint`}
      >
        <strong>{label}</strong>
        {file !== null && <span className={styles.filename}>{file.name}</span>}
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      </button>
    </div>
  );
}
export { FileDropzone, type FileDropzoneProps };
