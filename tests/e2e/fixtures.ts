import { test as base } from '@playwright/test';

interface ScenarioFixtures {
  readonly isolatedScenario: boolean;
}
const test = base.extend<ScenarioFixtures>({
  isolatedScenario: [
    async ({ request, baseURL }, use): Promise<void> => {
      if (baseURL === undefined) {
        throw new Error('Missing browser origin');
      }
      const reset = await request.post('/api/__e2e/reset-rate-limits', {
        headers: { Origin: baseURL },
      });
      if (!reset.ok()) {
        throw new Error('Could not isolate the disposable API scenario');
      }
      await use(true);
    },
    { auto: true },
  ],
});
export { test };
