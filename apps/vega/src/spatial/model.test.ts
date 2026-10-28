import { describe, expect, it } from 'vitest';
import { geometryCenter } from './model';

describe('territory viewport center', () => {
  it('centers the full extent across separate polygons and negative coordinates', () => {
    expect(
      geometryCenter({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-100, -80],
              [-60, -80],
              [-60, -40],
              [-100, -80],
            ],
          ],
          [
            [
              [20, 40],
              [60, 40],
              [60, 80],
              [20, 40],
            ],
          ],
        ],
      }),
    ).toEqual([-20, 0]);
  });
  it('uses an exterior extent without letting a hole move the view to a corner', () => {
    expect(
      geometryCenter({
        type: 'Polygon',
        coordinates: [
          [
            [-80, -40],
            [80, -40],
            [80, 40],
            [-80, 40],
            [-80, -40],
          ],
          [
            [20, 10],
            [30, 10],
            [30, 20],
            [20, 10],
          ],
        ],
      }),
    ).toEqual([0, 0]);
    expect(geometryCenter(null)).toEqual([0, 0]);
  });
});
