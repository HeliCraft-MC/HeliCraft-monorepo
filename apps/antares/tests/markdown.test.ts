// oxlint-disable no-script-url -- Malicious URL is a literal sanitization regression fixture, never executed.
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/modules/content/markdown';

describe('published Markdown safety', () => {
  it('renders GFM and strips scripts, event handlers and unsafe links', async () => {
    const html = await renderMarkdown(
      '# Заголовок\n\n**Текст**\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n[good](https://example.com)',
    );
    expect(html).toContain('<h1 id="user-content-hc-heading-заголовок">Заголовок</h1>');
    expect(html).toContain('<strong>Текст</strong>');
    expect(html).toContain('<table>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://example.com"');
  });
});
