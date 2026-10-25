import type { ReactElement } from 'react';
import { StateName as Name } from '@helicraft/atria';
import { StatePreviewName } from './state-preview-name';
import { StateNameById } from './state-name-by-id';

interface StateNameProps {
  readonly id?: string;
  readonly name?: string;
  readonly href?: string;
  readonly color?: string;
  readonly slug?: string;
  readonly facts?: string;
  readonly linked?: boolean;
}
function StateName({
  id,
  name,
  href,
  color = 'var(--primary)',
  slug,
  facts,
  linked = true,
}: StateNameProps): ReactElement {
  if (!linked) {
    return (
      <Name
        name={name ?? slug ?? ''}
        href={href ?? ''}
        color={color}
        facts={facts}
        linked={false}
      />
    );
  }
  if (slug !== undefined) {
    return (
      <StatePreviewName
        name={name ?? slug}
        href={href ?? `/states/${slug}`}
        color={color}
        slug={slug}
        facts={facts}
      />
    );
  }
  if (id !== undefined) {
    return <StateNameById id={id} name={name} color={color} facts={facts} />;
  }
  return <Name name={name ?? ''} href={href ?? ''} color={color} facts={facts} linked={false} />;
}
export { StateName };
