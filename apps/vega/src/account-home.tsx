import { getRouteApi, Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { MinecraftAvatar } from '@helicraft/atria';

import styles from './account.module.scss';

const route = getRouteApi('/app');

export function AccountHome(): ReactElement {
  const { principal } = route.useRouteContext();
  return (
    <>
      <div className={styles.profile}>
        <MinecraftAvatar
          name={principal.username}
          src={`/api/v1/public/players/${principal.id}/avatar.png?v=${principal.currentSkinId ?? 'default'}`}
          size={80}
        />
        <div>
          <p className={styles.eyebrow}>Твоя постоянная идентичность</p>
          <h1>Привет, {principal.username}.</h1>
          <p className={styles.uuid}>{principal.id}</p>
        </div>
      </div>
      <div className={styles.section}>
        <h2>Первая глава ещё впереди.</h2>
        <p>Твой аккаунт готов. Выбери скин, сохрани пароль и следи за разработкой мира.</p>
        <p className={styles.paragraph}>
          <Link to="/chronicle">Читать летопись →</Link>
        </p>
      </div>
      {principal.permissions.includes('content.read') ||
      principal.permissions.includes('users.read') ? (
        <Link to="/admin">Открыть администрацию →</Link>
      ) : null}
    </>
  );
}
