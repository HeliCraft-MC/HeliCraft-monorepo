import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { ManagementSection } from './management-sections';

function ManagementSectionLink({
  stateId,
  section,
  current = false,
  className,
  children,
}: Readonly<{
  stateId: string;
  section: ManagementSection;
  current?: boolean;
  className?: string;
  children: ReactNode;
}>): ReactElement {
  const params = useMemo(() => ({ stateId }), [stateId]);
  const search = useMemo(() => ({ section }), [section]);
  return (
    <Link
      to="/app/states/$stateId/manage"
      params={params}
      search={search}
      aria-current={current ? 'page' : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
export { ManagementSectionLink };
