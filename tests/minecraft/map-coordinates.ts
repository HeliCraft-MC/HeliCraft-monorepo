import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function verifyCopiedCoordinates(
  page: Page,
  expected: readonly [number, number],
  worldUnitsPerPixel: number,
): Promise<void> {
  await page.getByRole('button', { name: 'Copy coordinates', exact: true }).click();
  await expect(page.getByText('Copied.', { exact: true })).toBeVisible();
  const copied = await page.evaluate(async () => await navigator.clipboard.readText());
  await expect(page.getByText(copied, { exact: true })).toBeVisible();
  const match = /^X (?<x>-?\d+\.\d{2}) · Z (?<z>-?\d+\.\d{2})$/u.exec(copied);
  // Browser click positions round to CSS pixels on fractionally sized map surfaces.
  expect(Math.abs(Number(match?.groups?.x) - expected[0])).toBeLessThanOrEqual(worldUnitsPerPixel);
  expect(Math.abs(Number(match?.groups?.z) - expected[1])).toBeLessThanOrEqual(worldUnitsPerPixel);
}
export { verifyCopiedCoordinates };
