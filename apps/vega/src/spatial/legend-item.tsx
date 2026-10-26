import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { PublicTerritorySummary } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

interface TerritoryStyle extends CSSProperties {
  '--territory-color': string;
}
function TerritoryLegendItem({
  territory,
}: Readonly<{ territory: PublicTerritorySummary }>): ReactElement {
  const { locale } = useTranslation();
  const style: TerritoryStyle = useMemo(
    () => ({ '--territory-color': territory.color }),
    [territory.color],
  );
  return (
    <li style={style}>
      <a href={`/states/${territory.slug}?lang=${locale}`}>{displayText(territory.name, locale)}</a>
      <p>
        {territory.area.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')} ·{' '}
        {uiText(locale, 'Ревизия', 'Revision')} {territory.number}
      </p>
    </li>
  );
}
export { TerritoryLegendItem };
