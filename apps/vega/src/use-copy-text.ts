import { useCallback } from 'react';

async function copy(value: string, onMessage: (message: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    onMessage('profile.uuidCopied');
  } catch {
    onMessage('profile.copyUuidFailed');
  }
}
function useCopyText(value: string, onMessage: (message: string) => void): () => void {
  return useCallback((): void => {
    void copy(value, onMessage);
  }, [value, onMessage]);
}
export { useCopyText };
