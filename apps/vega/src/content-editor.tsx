import { useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Alert, Spinner } from '@helicraft/atria';
import { readDocument } from './editor-api';
import type { Kind } from './editor-api';
import { ContentEditorForm } from './content-editor-form';

function ContentEditor(): ReactElement {
  const { pathname } = useLocation();
  const kind: Kind = pathname.startsWith('/admin/pages') ? 'PAGE' : 'CHRONICLE';
  const [last] = pathname.split('/').toReversed();
  const id = last === 'new' ? null : (last ?? null);
  const result = useQuery({
    queryKey: ['document', kind, id],
    enabled: id !== null,
    queryFn: async () => {
      if (id === null) {
        throw new Error('Missing document identifier');
      }
      return await readDocument(kind, id);
    },
  });
  if (id !== null && result.isPending) {
    return <Spinner />;
  }
  if (result.isError) {
    return <Alert tone="danger">Документ недоступен</Alert>;
  }
  return (
    <ContentEditorForm
      key={`${id ?? 'new'}:${result.data?.revision ?? 0}:${result.data?.status ?? 'DRAFT'}`}
      kind={kind}
      document={result.data}
    />
  );
}
export { ContentEditor };
