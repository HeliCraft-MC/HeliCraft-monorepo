import type { MinecraftBanner } from '@helicraft/alhena';

type Dye = MinecraftBanner['baseColor'];
type Pattern = MinecraftBanner['layers'][number]['pattern'];
const dyes: Record<Dye, string> = {
  white: '#f9fffe',
  orange: '#f9801d',
  magenta: '#c74ebd',
  light_blue: '#3ab3da',
  yellow: '#fed83d',
  lime: '#80c71f',
  pink: '#f38baa',
  gray: '#474f52',
  light_gray: '#9d9d97',
  cyan: '#169c9c',
  purple: '#8932b8',
  blue: '#3c44aa',
  brown: '#835432',
  green: '#5e7c16',
  red: '#b02e26',
  black: '#1d1d21',
};
const patternColumns: Record<Pattern, number> = {
  border: 1,
  bricks: 2,
  circle: 3,
  creeper: 4,
  cross: 5,
  curly_border: 6,
  diagonal_left: 7,
  diagonal_right: 8,
  diagonal_up_left: 9,
  diagonal_up_right: 10,
  flow: 11,
  flower: 12,
  globe: 13,
  gradient: 14,
  gradient_up: 15,
  guster: 16,
  half_horizontal: 17,
  half_horizontal_bottom: 18,
  half_vertical: 19,
  half_vertical_right: 20,
  mojang: 21,
  piglin: 22,
  rhombus: 23,
  skull: 24,
  small_stripes: 25,
  square_bottom_left: 26,
  square_bottom_right: 27,
  square_top_left: 28,
  square_top_right: 29,
  straight_cross: 30,
  stripe_bottom: 31,
  stripe_center: 32,
  stripe_downleft: 33,
  stripe_downright: 34,
  stripe_left: 35,
  stripe_middle: 36,
  stripe_right: 37,
  stripe_top: 38,
  triangle_bottom: 39,
  triangle_top: 40,
  triangles_bottom: 41,
  triangles_top: 42,
};
const dyeRows: Record<Dye, number> = {
  white: 1,
  orange: 2,
  magenta: 3,
  light_blue: 4,
  yellow: 5,
  lime: 6,
  pink: 7,
  gray: 8,
  light_gray: 9,
  cyan: 10,
  purple: 11,
  blue: 12,
  brown: 13,
  green: 14,
  red: 15,
  black: 16,
};
function isDye(value: string): value is Dye {
  return Object.hasOwn(dyes, value);
}
function isPattern(value: string): value is Pattern {
  return Object.hasOwn(patternColumns, value);
}
const BASE_LAYER = -1;
const MAX_LAYERS = 6;
export { dyes, patternColumns, dyeRows, isDye, isPattern, BASE_LAYER, MAX_LAYERS };
