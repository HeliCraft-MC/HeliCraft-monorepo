import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { PublicStateSummary } from '@helicraft/alhena';
import { StateCard } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { BannerPreview } from './banner-preview';
import { displayText, label, uiText } from './text';

function PublicStateCard({ state }: Readonly<{ state: PublicStateSummary }>): ReactElement {
  const { locale } = useTranslation();
  const name = displayText(state.name, locale) || state.slug;
  const flag = useMemo(
    () =>
      state.horizontalFlag.mode === 'PNG' ? (
        <img
          src={`/api/v1/public/states/${state.slug}/flag`}
          alt={`${uiText(locale, 'Флаг', 'Flag')}: ${name}`}
          loading="lazy"
          width="320"
          height="160"
        />
      ) : (
        <BannerPreview
          design={state.horizontalFlag.design}
          horizontal
          label={`${uiText(locale, 'Флаг', 'Flag')}: ${name}`}
        />
      ),
    [state.horizontalFlag, state.slug, name, locale],
  );
  const facts = useMemo(
    () => [
      {
        label: uiText(locale, 'Гражданство', 'Citizenship'),
        value: label(state.citizenship.entryMode, locale),
      },
      {
        label: uiText(locale, 'Конституция', 'Constitution'),
        value: state.hasConstitution
          ? uiText(locale, 'Опубликована', 'Published')
          : uiText(locale, 'Без формального документа', 'No formal document'),
      },
    ],
    [locale, state.citizenship.entryMode, state.hasConstitution],
  );
  return (
    <StateCard
      name={name}
      href={`/states/${state.slug}`}
      flag={flag}
      description={displayText(state.description, locale)}
      citizens={state.citizens}
      populationLabel={uiText(locale, 'граждан', 'citizens')}
      government={`${uiText(locale, 'Должности:', 'Offices:')} ${state.officeCount}`}
      facts={facts}
    />
  );
}
export { PublicStateCard };
