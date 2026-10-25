import { afterEach, describe, expect, it } from 'vitest';
import { internalDestination } from '../src/use-spa-navigation';

function click(
  href: string,
  attributes: Record<string, string> = {},
  options: MouseEventInit & { handled?: boolean } = {},
): string | null {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  const icon = document.createElement('span');
  anchor.append(icon);
  document.body.append(anchor);
  let destination: string | null = null;
  anchor.addEventListener('click', (event) => {
    if (options.handled === true) {
      event.preventDefault();
    }
    destination = internalDestination(event, location.origin);
    event.preventDefault();
  });
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...options });
  icon.dispatchEvent(event);
  return destination;
}
afterEach(() => {
  document.body.replaceChildren();
});
describe('same-document application navigation', () => {
  it('routes ordinary internal anchors including clicks on child icons', () => {
    expect(click('/app/states?lang=en#drafts')).toBe('/app/states?lang=en#drafts');
  });
  it('preserves external, download, api, fragment and explicitly native links', () => {
    for (const href of [
      'https://outside.invalid/app',
      'mailto:team@example.com',
      '#drafts',
      '/api/v1/image',
      '/api',
      'http://[',
      '/guide.pdf',
    ]) {
      expect(click(href), href).toBeNull();
    }
    const cases: Record<string, string>[] = [
      { target: '_blank' },
      { download: '' },
      { 'data-native-navigation': '' },
    ];
    for (const attributes of cases) {
      expect(click('/app', attributes)).toBeNull();
    }
  });
  it('preserves modified clicks and events handled by components', () => {
    for (const options of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      expect(click('/app', {}, options)).toBeNull();
    }
    expect(click('/app', {}, { handled: true })).toBeNull();
  });
});
