import type { ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTranslation } from '../src/i18n';
import { SiteBrandingContext } from '../src/site-branding';
import { metadata } from '../src/metadata';

function BrandedText(): ReactElement {
  const { text } = useTranslation();
  return <p>{text('world.title')}</p>;
}
const branding = { serverName: 'Aurora', githubUrl: '', logoUrl: null };
afterEach(cleanup);
describe('server display identity', () => {
  it('uses the configured server name in translated interface and metadata', () => {
    render(
      <SiteBrandingContext.Provider value={branding}>
        <BrandedText />
      </SiteBrandingContext.Provider>,
    );
    expect(screen.getByText('Мир Aurora')).toBeInTheDocument();
    const result = metadata({
      serverName: 'Aurora',
      title: 'World',
      description: 'Explore {serverName}',
      path: '/world',
      origin: 'https://example.test',
    });
    expect(result.meta).toContainEqual({ title: 'World · Aurora' });
    expect(result.meta).toContainEqual({ name: 'description', content: 'Explore Aurora' });
    expect(result.scripts[0]?.children).toContain('Explore Aurora');
  });
});
