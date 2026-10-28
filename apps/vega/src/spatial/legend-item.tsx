import { useCallback, useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { PublicTerritorySummary } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { ArrowUpRight, Check } from 'lucide-react';
import styles from './spatial.module.scss';

interface TerritoryStyle extends CSSProperties {
  '--territory-color': string;
}
function TerritoryLegendItem({
  territory,
  selected,
  onSelect,
}: Readonly<{
  territory: PublicTerritorySummary;
  selected: boolean;
  onSelect: (id: string) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const style: TerritoryStyle = useMemo(
    () => ({ '--territory-color': territory.color }),
    [territory.color],
  );
  const select = useCallback((): void => {
    onSelect(territory.stateId);
  }, [onSelect, territory.stateId]);
  return (
    <li style={style} className={styles.territoryItem} data-selected={selected}>
      <button type="button" onClick={select} aria-pressed={selected}>
        <span className={styles.territorySwatch} />
        <span>
          <strong>{displayText(territory.name, locale)}</strong>
          <small>
            {territory.area.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
          </small>
        </span>
        {selected && <Check size={16} aria-hidden="true" />}
      </button>
      <a href={`/states/${territory.slug}?lang=${locale}`}>
        {displayText(territory.name, locale)}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </li>
  );
}
export { TerritoryLegendItem };
