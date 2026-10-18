import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityMarkdown } from '../src/entity-markdown';
import { LocaleProvider } from '../src/locale-provider';

const PLAYER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const document = `<p>Founded by <a href="/players/${PLAYER}"><img src="/api/v1/public/players/${PLAYER}/avatar.png"> Builder</a> and <a href="/states/aurora">Aurora</a>.</p><h2 id="hc-heading-law">The law</h2><ul><li><strong>Rights</strong></li></ul><table><tbody><tr><td colspan="2">Participation</td></tr></tbody></table><ul class="contains-task-list"><li><input type="checkbox" checked disabled> Done</li></ul><p><a href="https://example.test">Reference</a></p>`;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('constitution entity links', () => {
  it('keeps the complete SSR document and uses ordinary entity links without duplicate heads', () => {
    const client = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <EntityMarkdown html={document} />
      </QueryClientProvider>,
    );
    expect(markup).toContain('Founded by');
    expect(markup).toContain('hc-heading-law');
    expect(markup).toContain('<strong>Rights</strong>');
    expect(markup).toContain('colSpan="2"');
    expect(markup.match(/<img/gu)).toHaveLength(1);
    expect(markup).toContain(`href="/players/${PLAYER}"`);
    expect(markup).toContain('href="/states/aurora"');
    expect(markup).toContain('href="https://example.test"');
  });
  it('enables nickname preview by default and requests only cookie-free public facts', async () => {
    const request = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async (): Promise<Response> => {
        await Promise.resolve();
        return Response.json({
          id: PLAYER,
          name: 'Builder',
          registeredAt: '2026-10-18T00:00:00Z',
          skinId: null,
          states: [],
        });
      },
    );
    vi.stubGlobal('fetch', request);
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <LocaleProvider locale="en">
          <EntityMarkdown html={document} />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.focus(screen.getByRole('link', { name: 'Builder' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Builder');
    expect(request).toHaveBeenCalledOnce();
    const [input] = request.mock.calls[0] ?? [];
    expect(input).toBeInstanceOf(Request);
    if (input instanceof Request) {
      expect(input.credentials).toBe('omit');
    }
  });
});
