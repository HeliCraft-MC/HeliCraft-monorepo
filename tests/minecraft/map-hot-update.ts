// oxlint-disable no-magic-numbers, no-await-in-loop -- Real keyboard workflow changes a saved territorial geometry through Vega and ratifies it using separate disposable browser actors.
import { expect } from '@playwright/test';
import type { Browser } from '@playwright/test';
import type {
  TerritoryGeometry,
  TerritoryDraftInput,
} from '../../apps/antares/src/modules/spatial/contracts';

interface BrowserTerritoryUpdate {
  readonly browser: Browser;
  readonly origin: string;
  readonly run: string;
  readonly stateId: string;
  readonly actorCookie: string;
  readonly adminCookie: string;
  readonly geometry: TerritoryGeometry;
  readonly change: TerritoryDraftInput['change'];
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- The complete saved-draft → explicit confirmation → independent administrative browser journey is one acceptance action.
async function updateTerritoryThroughVega(input: BrowserTerritoryUpdate): Promise<void> {
  const editor = await input.browser.newContext();
  const admin = await input.browser.newContext();
  try {
    for (const [context, cookie] of [
      [editor, input.actorCookie],
      [admin, input.adminCookie],
    ] as const) {
      const prefix = 'helicraft_session=';
      if (!cookie.startsWith(prefix)) {
        throw new Error('Expected disposable owner session');
      }
      await context.addCookies([
        {
          name: 'helicraft_session',
          value: cookie.slice(prefix.length),
          url: input.origin,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
    }
    const page = await editor.newPage();
    await page.goto(`${input.origin}/app/states/${input.stateId}/manage?section=territory&lang=en`);
    await page.getByRole('button', { name: 'New territory draft', exact: true }).click();
    const coordinateEditor = page.getByText('Coordinates and keyboard editing', { exact: true });
    await coordinateEditor.click();
    await page.getByRole('button', { name: 'Load current coordinates', exact: true }).click();
    const coordinates = page.getByLabel('GeoJSON [X,Z]', { exact: true });
    expect(await coordinates.inputValue()).toContain('Polygon');
    await coordinates.fill(JSON.stringify(input.geometry));
    await page.getByRole('button', { name: 'Apply coordinates', exact: true }).click();
    await page.getByLabel('Change type', { exact: true }).selectOption(input.change);
    await page
      .getByLabel('Reason for this change · English', { exact: true })
      .fill(`Native game acceptance: ${input.change} through the actual Vega editor`);
    await expect(page.getByText('All changes saved.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Save and validate', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Submit for state decision', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Submit for state decision', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm submission', exact: true }).click();
    await expect(
      page.getByText('Proposal submitted. Geometry and reasoning are frozen.', { exact: false }),
    ).toBeVisible();
    const review = await admin.newPage();
    await review.goto(`${input.origin}/admin/territories?lang=en`);
    await review
      .getByRole('button', { name: new RegExp(input.stateId.slice(0, 8), 'u') })
      .first()
      .click();
    const reason = `Current Governance, exact ${input.change} geometry and conflicts verified through Vega`;
    await review.getByLabel('Administrative decision reason', { exact: true }).fill(reason);
    await review.getByRole('button', { name: 'Ratify territory', exact: true }).click();
    await expect(review.getByText(`APPROVE: ${reason}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByText('Territory ratified and published.', { exact: true }),
    ).toBeVisible();
  } catch (error) {
    for (const [index, page] of [...editor.pages(), ...admin.pages()].entries()) {
      await page
        .screenshot({
          path: `${input.run}/hot-update-${input.change}-failure-${index}.png`,
          fullPage: true,
        })
        .catch(() => null);
    }
    throw error;
  } finally {
    await editor.close();
    await admin.close();
  }
}
export { updateTerritoryThroughVega };
