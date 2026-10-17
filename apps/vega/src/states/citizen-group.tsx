import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { PlayerNickname } from '../player-nickname';
import styles from './public-detail.module.scss';

function CitizenGroup({ citizens }: Readonly<{ citizens: StateDetail['citizens'] }>): ReactElement {
  return (
    <ul className={`${styles.people} ${styles.citizens}`}>
      {citizens.map((citizen) => (
        <li key={citizen.id}>
          <PlayerNickname id={citizen.id} name={citizen.name} size={40} />
        </li>
      ))}
    </ul>
  );
}
export { CitizenGroup };
