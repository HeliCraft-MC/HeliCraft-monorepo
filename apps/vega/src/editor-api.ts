import {
  createPage,
  createChronicleEntry,
  getAdminPage,
  getAdminChronicleEntry,
  savePage,
  saveChronicleEntry,
  publishPage,
  publishChronicleEntry,
  unpublishPage,
  unpublishChronicleEntry,
  archivePage,
  archiveChronicleEntry,
  getPageRevisions,
  getChronicleEntryRevisions,
  restorePage,
  restoreChronicleEntry,
  previewMarkdown,
} from '@helicraft/alhena';
import type { AdminContent, CreatePageData, GetPageRevisionsResponse } from '@helicraft/alhena';
import { browserClient } from './account-api';

type ContentInput = CreatePageData['body'];
type Kind = 'PAGE' | 'CHRONICLE';
type Revision = GetPageRevisionsResponse[number];
async function readDocument(kind: Kind, id: string): Promise<AdminContent> {
  const { data } = await (kind === 'PAGE' ? getAdminPage : getAdminChronicleEntry)({
    client: browserClient(),
    path: { id },
    throwOnError: true,
  });
  return data;
}
async function writeDocument(
  kind: Kind,
  id: string | null,
  input: ContentInput,
): Promise<AdminContent> {
  if (id !== null) {
    const { data } = await (kind === 'PAGE' ? savePage : saveChronicleEntry)({
      client: browserClient(),
      path: { id },
      body: input,
      throwOnError: true,
    });
    return data;
  }
  const { data } = await (kind === 'PAGE' ? createPage : createChronicleEntry)({
    client: browserClient(),
    body: input,
    throwOnError: true,
  });
  return data;
}
async function transitionDocument(
  kind: Kind,
  id: string,
  state: 'publish' | 'unpublish' | 'archive',
): Promise<AdminContent> {
  const actions =
    kind === 'PAGE'
      ? { publish: publishPage, unpublish: unpublishPage, archive: archivePage }
      : {
          publish: publishChronicleEntry,
          unpublish: unpublishChronicleEntry,
          archive: archiveChronicleEntry,
        };
  const { data } = await actions[state]({
    client: browserClient(),
    path: { id },
    throwOnError: true,
  });
  return data;
}
async function documentRevisions(kind: Kind, id: string): Promise<Revision[]> {
  const { data } = await (kind === 'PAGE' ? getPageRevisions : getChronicleEntryRevisions)({
    client: browserClient(),
    path: { id },
    throwOnError: true,
  });
  return data;
}
async function restoreDocument(kind: Kind, id: string, revision: number): Promise<AdminContent> {
  const { data } = await (kind === 'PAGE' ? restorePage : restoreChronicleEntry)({
    client: browserClient(),
    path: { id },
    body: { revision },
    throwOnError: true,
  });
  return data;
}
async function previewDocument(markdown: string): Promise<string> {
  const { data } = await previewMarkdown({
    client: browserClient(),
    body: { markdown },
    throwOnError: true,
  });
  return data.html;
}
export {
  readDocument,
  writeDocument,
  transitionDocument,
  documentRevisions,
  restoreDocument,
  previewDocument,
  type ContentInput,
  type Kind,
  type Revision,
};
