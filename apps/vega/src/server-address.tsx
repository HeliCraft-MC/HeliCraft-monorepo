import { Icon } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import styles from './home.module.scss';

function ServerAddress({ address }: Readonly<{ address: string }>): ReactElement {
  const { text } = useTranslation();

  const [message, setMessage] = useState('common.copy');
  const copy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(address);
      setMessage('common.copied');
    } catch {
      setMessage('home.server.copyManually');
    }
  }, [address]);
  const handleCopy = useCallback((): void => {
    void copy();
  }, [copy]);
  return (
    <div className={styles.address}>
      <span>{address}</span>
      <button type="button" onClick={handleCopy} aria-label={text('home.server.copyAddress')}>
        <Icon name="copy" /> {text(message)}
      </button>
      <output className={styles.srOnly}>{message === 'common.copy' ? '' : text(message)}</output>
    </div>
  );
}
export { ServerAddress };
