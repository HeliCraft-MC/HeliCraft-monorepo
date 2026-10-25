import type { ReactElement } from 'react';
import type { MonetaryDirective, StateDetail } from '@helicraft/alhena';
import { EmptyState } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { DirectiveCard } from './directive-card';
import styles from './monetary.module.scss';

const NO_CURRENCIES: readonly { id: string; code: string }[] = [];
function DirectiveList({
  items,
  state,
  actorId,
  currencies = NO_CURRENCIES,
  onSaved,
}: Readonly<{
  items: readonly MonetaryDirective[];
  state: StateDetail;
  actorId: string;
  currencies?: readonly { id: string; code: string }[];
  onSaved: () => void;
}>): ReactElement {
  const { text } = useTranslation();
  return (
    <section className={styles.panel}>
      <h2>{text('monetary.directives')}</h2>
      {items.length === 0 && <EmptyState title={text('monetary.emptyDirectives')} />}
      {items.map((directive) => (
        <DirectiveCard
          key={directive.id}
          directive={directive}
          state={state}
          actorId={actorId}
          code={
            currencies.find(
              (currency) =>
                'currencyId' in directive.payload && currency.id === directive.payload.currencyId,
            )?.code ?? ''
          }
          onSaved={onSaved}
        />
      ))}
    </section>
  );
}
export { DirectiveList };
