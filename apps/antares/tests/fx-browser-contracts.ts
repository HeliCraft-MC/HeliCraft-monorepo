import { z } from 'zod';

const FxBrowserFixtureSchema = z.object({
  firstStateId: z.uuid(),
  secondStateId: z.uuid(),
  firstCurrency: z.uuid(),
  secondCurrency: z.uuid(),
});
const FxBrowserObservationsSchema = z.object({
  observations: z.array(z.object({ path: z.string(), cookiePresent: z.boolean() })),
});
type FxBrowserFixture = z.infer<typeof FxBrowserFixtureSchema>;
export { FxBrowserFixtureSchema, FxBrowserObservationsSchema, type FxBrowserFixture };
