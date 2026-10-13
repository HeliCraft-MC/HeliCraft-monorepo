import { PlayerNickname } from './player-nickname';
import { Icon } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { formatDate } from './date-format';
import styles from './account.module.scss';

const route = getRouteApi('/app');

export function AccountHome(): ReactElement {
  const { text, locale } = useTranslation();

  const { principal } = route.useRouteContext();
  return (
    <>
      <div className={styles.profile}>
        <div>
          <h1>
            {text('account.greeting')}{' '}
            <PlayerNickname
              id={principal.id}
              name={principal.username}
              skinId={principal.currentSkinId}
            />
            .
          </h1>
          <p className={styles.paragraph}>
            {text('profile.registeredAt')} {formatDate(principal.createdAt, locale)}
          </p>
        </div>
      </div>
      <div className={styles.actionGrid}>
        <Link className={styles.actionCard} to="/app/settings/profile">
          <h2>{text('account.profile')}</h2>
          <p>{text('account.profileHint')}</p>
          <Icon name="arrowRight" />
        </Link>
        <Link className={styles.actionCard} to="/app/settings/skin">
          <h2>{text('account.skin')}</h2>
          <p>{text('account.skinHint')}</p>
          <Icon name="arrowRight" />
        </Link>
        <Link className={styles.actionCard} to="/app/gallery/new">
          <h2>{text('gallery.upload.title')}</h2>
          <p>{text('account.galleryHint')}</p>
          <Icon name="arrowRight" />
        </Link>
        <Link className={styles.actionCard} to="/app/settings/security">
          <h2>{text('account.security')}</h2>
          <p>{text('account.securityHint')}</p>
          <Icon name="arrowRight" />
        </Link>
      </div>
      {principal.permissions.includes('content.read') ||
      principal.permissions.includes('users.read') ? (
        <Link to="/admin">
          {text('common.openAdministration')} <Icon name="arrowRight" />
        </Link>
      ) : null}
    </>
  );
}
