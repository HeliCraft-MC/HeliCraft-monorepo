import type { ReactElement } from 'react';
import type { PublishedCompanyProfile } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyName } from '../company-name';
import { StateName } from '../state-name';
import { PlayerNickname } from '../player-nickname';

type Identity = PublishedCompanyProfile['owners']['items'][number]['identity'];
function LegalIdentity({ identity }: Readonly<{ identity: Identity }>): ReactElement {
  const { locale } = useTranslation();
  const name =
    displayText(identity.name, locale) ||
    uiText(locale, 'Субъект недоступен', 'Identity unavailable');
  if (identity.owner.type === 'PLAYER' && identity.href !== null) {
    return <PlayerNickname id={identity.owner.id} name={name} />;
  }
  if (identity.href === null) {
    return <span>{name}</span>;
  }
  if (identity.owner.type === 'COMPANY') {
    return <CompanyName id={identity.owner.id} name={name} />;
  }
  return (
    <StateName
      name={name}
      href={identity.href}
      slug={identity.href.replace('/states/', '')}
      color="var(--primary)"
    />
  );
}
export { LegalIdentity };
