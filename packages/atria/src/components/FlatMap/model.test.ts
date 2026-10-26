import { describe, expect, it } from 'vitest';
import { flatToMap, mapToFlat } from './model';

describe('squaremap planar coordinates', () => {
  it.each([
    { point: [0, 0] as const, projected: [0, 0] },
    { point: [512, 512] as const, projected: [-64, 64] },
    { point: [-512, -512] as const, projected: [64, -64] },
    { point: [29_999_984, -29_999_984] as const, projected: [3_749_998, 3_749_998] },
  ])('preserves X/Z and northward negative Z at $point', ({ point, projected }) => {
    expect(flatToMap(point).map((value) => (value === 0 ? 0 : value))).toEqual(projected);
    expect(mapToFlat(flatToMap(point))).toEqual(point);
  });
  it('uses the registered native zoom rather than a geographic projection', () => {
    expect(flatToMap([64, -32], 2)).toEqual([8, 16]);
    expect(mapToFlat([8, 16], 2)).toEqual([64, -32]);
  });
});
