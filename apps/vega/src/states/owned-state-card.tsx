import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { ListMyStatesResponse } from '@helicraft/alhena';
import { StateCard } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from './text';
import { BannerPreview } from './banner-preview';

function OwnedStateCard({
  state,
}: Readonly<{ state: ListMyStatesResponse['items'][number] }>): ReactElement {
  const { locale } = useTranslation();
  const flag = useMemo(() => {
    if (state.horizontalFlag === undefined) {
      return null;
    }
    return state.horizontalFlag.mode === 'BANNER' ? (
      <BannerPreview
        design={state.horizontalFlag.design}
        horizontal
        label={uiText(locale, 'Флаг государства', 'State flag')}
      />
    ) : (
      <img
        src={`/api/v1/account/states/${state.id}/flag`}
        alt={uiText(locale, 'Флаг государства', 'State flag')}
        width="320"
        height="160"
        loading="lazy"
      />
    );
  }, [state.horizontalFlag, state.id, locale]);
  return (
    <StateCard
      name={displayText(state.name, locale) || state.slug}
      href={`/app/states/${state.id}/manage`}
      color={state.color}
      flag={flag}
      government={label(state.status, locale)}
    />
  );
}
export { OwnedStateCard };
