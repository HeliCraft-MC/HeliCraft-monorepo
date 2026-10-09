import { useState } from 'react';
import type { ReactElement } from 'react';
import { IconButton } from '@helicraft/atria';
import { useCopyText } from './use-copy-text';

const UUID_PREVIEW_LENGTH = 8;
function CopyUuid({ uuid }: Readonly<{ uuid: string }>): ReactElement {
  const [message, setMessage] = useState<string | null>(null);
  const handleCopy = useCopyText(uuid, setMessage);
  return (
    <>
      <code title={uuid}>{uuid.slice(0, UUID_PREVIEW_LENGTH)}</code>{' '}
      <IconButton tone="quiet" label={`Копировать UUID ${uuid}`} onClick={handleCopy}>
        ⧉
      </IconButton>
      {message === null ? null : <output>{message}</output>}
    </>
  );
}
export { CopyUuid };
