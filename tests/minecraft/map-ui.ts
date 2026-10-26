// oxlint-disable no-magic-numbers, max-lines-per-function, max-statements, no-await-in-loop -- Real browser acceptance uses bounded Minecraft fixture coordinates and sequential UI actions against the running disposable services.
import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import type { Database } from '../../apps/antares/src/db';
import { SessionService } from '../../apps/antares/src/modules/sessions/service';
import { monetaryFixture } from '../../apps/antares/tests/monetary-fixture';
import { TerritoryGeometrySchema } from '../../apps/antares/src/modules/spatial/contracts';
import { addTerritorialAuthority } from '../../apps/antares/tests/spatial-fixture';

interface MapUiContext {
  readonly browser: Browser;
  readonly db: Database['db'];
  readonly origin: string;
  readonly run: string;
  readonly worldId: string;
}
async function draw(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  const surface = page.getByRole('region', { name: 'Minecraft political map — X/Z' });
  await surface.scrollIntoViewIfNeeded();
  const bounds = await surface.boundingBox();
  if (!bounds) {
    throw new Error('No live map surface');
  }
  for (const [x, z] of points) {
    await page.mouse.click(bounds.x + bounds.width / 2 + x, bounds.y + bounds.height / 2 + z);
  }
}
async function readDraftGeometry(page: Page): Promise<string> {
  const summary = page.getByText('Coordinates and keyboard editing', { exact: true });
  if ((await summary.locator('..').getAttribute('open')) === null) {
    await summary.click();
  }
  await page.getByRole('button', { name: 'Load current coordinates', exact: true }).click();
  return await page.getByLabel('GeoJSON [X,Z]', { exact: true }).inputValue();
}
async function verifyMapUi(context: MapUiContext): Promise<void> {
  const fixture = await monetaryFixture(context.db, 'TM');
  await addTerritorialAuthority(context.db, {
    ...fixture,
    name: { en: 'Map acceptance', ru: 'Проверка карты' },
  });
  const sessions = new SessionService(context.db);
  const editor = await context.browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const admin = await context.browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const errors: string[] = [];
  try {
    for (const [browserContext, accountId] of [
      [editor, fixture.founderId],
      [admin, fixture.adminId],
    ] as const) {
      await browserContext.addCookies([
        {
          name: 'helicraft_session',
          value: await sessions.issue(accountId),
          url: context.origin,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
    }
    const page = await editor.newPage();
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await page.goto(
      `${context.origin}/app/states/${fixture.stateId}/manage?section=territory&lang=en`,
    );
    await page.getByRole('button', { name: 'New territory draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add polygon', exact: true })).toBeVisible();
    const map = page.getByRole('region', { name: 'Minecraft political map — X/Z' });
    await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible();
    await page.getByRole('button', { name: 'Add polygon', exact: true }).click();
    await draw(page, [
      [-128, -48],
      [-32, -48],
      [-32, 48],
      [-128, 48],
      [-128, -48],
    ]);
    await page.getByRole('button', { name: 'Edit vertices', exact: true }).click();
    const vertex = map.locator('.marker-icon:not(.marker-icon-middle)').first();
    await vertex.scrollIntoViewIfNeeded();
    const marker = await vertex.boundingBox();
    if (!marker) {
      throw new Error('No real editable vertex');
    }
    await page.mouse.move(marker.x + marker.width / 2, marker.y + marker.height / 2);
    await page.mouse.down();
    await page.mouse.move(marker.x + marker.width / 2 - 12, marker.y + marker.height / 2 - 8, {
      steps: 8,
    });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Cut a hole', exact: true }).click();
    await draw(page, [
      [-104, -16],
      [-80, -16],
      [-80, 16],
      [-104, 16],
      [-104, -16],
    ]);
    await page.getByRole('button', { name: 'Navigate', exact: true }).click();
    const cutGeometry = await readDraftGeometry(page);
    const parsedCut = TerritoryGeometrySchema.parse(JSON.parse(cutGeometry));
    expect(parsedCut.type).toBe('Polygon');
    expect(parsedCut.coordinates).toHaveLength(2);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await readDraftGeometry(page)).not.toBe(cutGeometry);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await readDraftGeometry(page)).toBe(cutGeometry);
    await expect(page.getByText('All changes saved.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByLabel('Change type', { exact: true }).selectOption('EXPAND');
    await page.getByRole('button', { name: 'Reset unsaved changes', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Change type', { exact: true })).toHaveValue('INITIAL');

    await page
      .getByLabel('Reason for this change · English', { exact: true })
      .fill(
        'A genuine browser-drawn test territory with a hole, reviewed against real world tiles.',
      );
    await expect(page.getByText('All changes saved.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.getByLabel('Reason for this change · English', { exact: true })).toHaveValue(
      'A genuine browser-drawn test territory with a hole, reviewed against real world tiles.',
    );
    await page.getByRole('button', { name: 'Save and validate', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Submit for state decision', exact: true }),
    ).toBeEnabled();
    await page.reload();
    await expect(map.locator('path.leaflet-interactive')).toHaveCount(3);
    await page.getByRole('button', { name: 'Save and validate', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Submit for state decision', exact: true }),
    ).toBeEnabled();
    await map.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${context.run}/territory-editor-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `${context.run}/territory-editor-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole('button', { name: 'Submit for state decision', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm submission', exact: true }).click();
    await expect(
      page.getByText('Proposal submitted. Geometry and reasoning are frozen.', { exact: false }),
    ).toBeVisible();
    const review = await admin.newPage();
    review.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await review.goto(`${context.origin}/admin/territories?lang=en`);
    await review
      .getByRole('button', { name: new RegExp(fixture.stateId.slice(0, 8), 'u') })
      .click();
    await review
      .getByLabel('Administrative decision reason', { exact: true })
      .fill('Verified actual drawn polygon, hole, completed Governance and no conflicts.');
    await review.getByRole('button', { name: 'Ratify territory', exact: true }).click();
    await expect(
      review.getByText(
        'APPROVE: Verified actual drawn polygon, hole, completed Governance and no conflicts.',
        { exact: true },
      ),
    ).toBeVisible();
    await editor.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: context.origin,
    });
    const publicPage = await editor.newPage();
    const viewportRequests: string[] = [];
    publicPage.on('request', (request) => {
      const target = new URL(request.url());
      if (target.pathname.endsWith(`/public/spatial/worlds/${context.worldId}/territories`)) {
        expect(['minX', 'minZ', 'maxX', 'maxZ'].every((key) => target.searchParams.has(key))).toBe(
          true,
        );
        viewportRequests.push(target.search);
      }
    });
    await publicPage.bringToFront();
    publicPage.on('pageerror', (error) => {
      errors.push(error.message);
    });
    const url = `${context.origin}/map?world=${context.worldId}&x=-80&z=0&zoom=5&lang=en`;
    const response = await publicPage.goto(url);
    const html = await response?.text();
    expect(html).toContain('Map acceptance');
    expect(html).toContain('Political map');
    expect(html).not.toContain('A genuine browser-drawn test territory');
    await expect(
      publicPage
        .getByRole('region', { name: 'Minecraft political map — X/Z' })
        .locator('.leaflet-tile-loaded')
        .first(),
    ).toBeVisible();
    await expect(
      publicPage.getByRole('link', { name: 'Map acceptance', exact: true }),
    ).toBeVisible();
    await publicPage.getByLabel('Select state', { exact: true }).selectOption(fixture.stateId);
    await expect(
      publicPage.getByRole('heading', { name: 'Boundary history', exact: true }),
    ).toBeVisible();
    await expect(
      publicPage.getByText(
        'Ratification: Verified actual drawn polygon, hole, completed Governance and no conflicts.',
        { exact: true },
      ),
    ).toBeVisible();
    await publicPage.getByLabel('State names', { exact: true }).uncheck();
    await expect(publicPage.locator('.leaflet-tooltip')).toHaveCount(0);
    await publicPage.getByLabel('State names', { exact: true }).check();
    await expect(publicPage.locator('.leaflet-tooltip').first()).toBeVisible();
    await publicPage.getByLabel('Minecraft terrain', { exact: true }).uncheck();
    await expect(publicPage.locator('.leaflet-tile')).toHaveCount(0);
    await publicPage.getByLabel('Minecraft terrain', { exact: true }).check();
    await expect(publicPage.locator('.leaflet-tile-loaded').first()).toBeVisible();
    const publicMap = publicPage.getByRole('region', { name: 'Minecraft political map — X/Z' });
    await publicMap.scrollIntoViewIfNeeded();
    const publicBounds = await publicMap.boundingBox();
    if (!publicBounds) {
      throw new Error('No public map surface');
    }
    await publicMap.click({
      position: { x: publicBounds.width / 2 + 8, y: publicBounds.height / 2 + 16 },
    });
    await expect(
      publicPage.getByRole('button', { name: 'Copy coordinates', exact: true }),
    ).toBeVisible();
    await publicPage.getByRole('button', { name: 'Copy coordinates', exact: true }).click();
    await expect(publicPage.getByText('Copied.', { exact: true })).toBeVisible();
    expect(await publicPage.evaluate(async () => await navigator.clipboard.readText())).toBe(
      'X -78.00 · Z 4.00',
    );
    await publicPage.screenshot({
      path: `${context.run}/political-map-desktop.png`,
      fullPage: true,
    });
    await publicPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= globalThis.innerWidth,
      ),
    ).toBe(true);
    await publicPage.screenshot({
      path: `${context.run}/political-map-mobile.png`,
      fullPage: true,
    });
    await expect.poll(() => viewportRequests.length).toBeGreaterThan(0);
    const previousViewport = viewportRequests.at(-1);
    await publicMap.focus();
    await publicMap.press('ArrowRight');
    await expect.poll(() => viewportRequests.at(-1)).not.toBe(previousViewport);
    await publicPage.setViewportSize({ width: 1440, height: 1000 });
    await publicPage.getByRole('link', { name: 'Your account', exact: true }).click();
    await expect(publicPage).toHaveURL(/\/app/u);
    // Let Leaflet's delayed window-resize callback settle after the SPA unmount.
    await publicPage.waitForTimeout(300);
    expect(errors).toEqual([]);
    // oxlint-disable-next-line no-console -- Emit only the sanitized browser acceptance-stage result.
    console.info(
      'Real Vega map tiles, pointer polygon/vertex/hole edits, saved reload, Governance submission, administrative ratification, public SSR and mobile passed.',
    );
  } catch (error) {
    for (const [index, failed] of [...editor.pages(), ...admin.pages()].entries()) {
      await failed
        .screenshot({ path: `${context.run}/map-ui-failure-${index}.png`, fullPage: true })
        .catch(() => null);
    }
    await Bun.write(`${context.run}/map-ui-errors.json`, JSON.stringify(errors));
    throw error;
  } finally {
    await editor.close();
    await admin.close();
  }
}
export { verifyMapUi };
