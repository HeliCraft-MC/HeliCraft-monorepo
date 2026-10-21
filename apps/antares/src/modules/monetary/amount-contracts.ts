import { z } from '@hono/zod-openapi';

const MinorSchema = z
  .string()
  .regex(/^(?:0|[1-9][0-9]{0,29})$/u)
  .openapi('MoneyMinor', {
    pattern: '^(?:0|[1-9][0-9]{0,29})$',
  });
const CumulativeMinorSchema = z
  .string()
  .regex(/^(?:0|[1-9][0-9]*)$/u)
  .openapi('CumulativeMoneyMinor', {
    pattern: '^(?:0|[1-9][0-9]*)$',
  });
const PositiveMinorSchema = MinorSchema.refine((value) => value !== '0', 'Amount must be positive');
export { MinorSchema, CumulativeMinorSchema, PositiveMinorSchema };
