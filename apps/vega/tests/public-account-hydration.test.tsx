import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Principal } from '@helicraft/alhena';
import { describe, expect, it } from 'vitest';
import { GalleryOwnerActions } from '../src/gallery-owner-actions';

const principal: Principal = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  username: 'Builder',
  status: 'ACTIVE',
  createdAt: '2026-10-18T00:00:00Z',
  currentSkinId: null,
  roles: ['PLAYER'],
  permissions: [],
};
describe('public account hydration boundary', () => {
  it('keeps owner controls out of server HTML even when the query cache already contains the owner', () => {
    const client = new QueryClient();
    client.setQueryData<Principal>(['account'], principal);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <GalleryOwnerActions id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" ownerId={principal.id} />
      </QueryClientProvider>,
    );
    expect(html).toBe('');
  });
});
