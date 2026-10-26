import { describe, it, expect } from 'vitest';
import { boundedViewport, initialViewport } from './viewport';

describe('political map spatial windows', () => {
  it('scales flat windows by native zoom and preserves negative X/Z', () => {
    const close = initialViewport([-100, -200], 3, 3);
    const far = initialViewport([-100, -200], 2, 3);
    expect(close).toEqual({ minX: -1636, minZ: -1736, maxX: 1436, maxZ: 1336 });
    expect(far.maxX - far.minX).toBe((close.maxX - close.minX) * 2);
  });
  it('keeps ordered bounded windows even after panning past the Minecraft border', () => {
    const bounds = boundedViewport({
      minX: 40_000_000,
      minZ: -50_000_000,
      maxX: 50_000_000,
      maxZ: -40_000_000,
    });
    expect(bounds.maxX).toBe(29_999_984);
    expect(bounds.minZ).toBe(-29_999_984);
    expect(bounds.minX).toBeLessThan(bounds.maxX);
    expect(bounds.minZ).toBeLessThan(bounds.maxZ);
  });
});
