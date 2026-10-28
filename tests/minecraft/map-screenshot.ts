import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const REPAINT_SETTLE_MS = 100;
async function captureMapPage(page: Page, path: string): Promise<void> {
  const surface = page.getByRole('region', {
    name: /^(?:Minecraft political map — X\/Z|Политическая карта Minecraft — X\/Z)$/u,
  });
  await surface.scrollIntoViewIfNeeded();
  await expect(surface.locator('.leaflet-tile-loaded').first()).toBeVisible();
  // Let ResizeObserver and Leaflet finish repainting after viewport changes.
  await page.waitForTimeout(REPAINT_SETTLE_MS);
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
  });
  await expect.poll(async () => await page.evaluate(() => globalThis.scrollY)).toBe(0);
  await page.screenshot({ path, fullPage: true });
}
export { captureMapPage };
