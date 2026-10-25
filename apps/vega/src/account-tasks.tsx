import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './account.module.scss';

function AccountTasks(): ReactElement {
  const { locale } = useTranslation();
  return (
    <div className={styles.actionGrid}>
      <Link className={styles.actionCard} to="/app/notifications">
        <Icon name="inbox" />
        <h2>{uiText(locale, 'Входящие', 'Inbox')}</h2>
        <p>
          {uiText(
            locale,
            'Согласия, одобрения и запросы, ожидающие вашего решения.',
            'Consents, approvals and requests awaiting your decision.',
          )}
        </p>
      </Link>
      <Link className={styles.actionCard} to="/app/states/new">
        <Icon name="state" />
        <h2>{uiText(locale, 'Государства', 'States')}</h2>
        <p>
          {uiText(
            locale,
            'Мои государства, гражданство и управление.',
            'Your states, citizenship and government workspaces.',
          )}
        </p>
      </Link>
      <Link className={styles.actionCard} to="/app/companies">
        <Icon name="company" />
        <h2>{uiText(locale, 'Компании', 'Companies')}</h2>
        <p>
          {uiText(
            locale,
            'Управление компаниями, учредительные проекты и решения.',
            'Company management, formation projects and decisions.',
          )}
        </p>
      </Link>
      <Link className={styles.actionCard} to="/app/wallet">
        <Icon name="wallet" />
        <h2>{uiText(locale, 'Кошелёк', 'Wallet')}</h2>
        <p>
          {uiText(
            locale,
            'Остатки, переводы и история операций.',
            'Balances, transfers and transaction history.',
          )}
        </p>
      </Link>
    </div>
  );
}
export { AccountTasks };
