[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Alhena

**Give programs one official way to talk to Antares.**

Generated TypeScript SDK · native Fetch · zero runtime dependencies

Alhena is generated from Antares OpenAPI with Hey API, using its bundled native Fetch client. The package has **no runtime dependencies**: the generator and TypeScript are development tools. Generated implementation, SDK methods and DTOs are committed under `src/generated`; never edit them by hand.

```sh
bun run generate
bun run dev:alhena
bun run build:alhena
bun run test:alhena
```

`dev:alhena` watches API schema imports, exports OpenAPI, regenerates and rebuilds the SDK. There is no server and no Compose. `getHello`, `getHealth`, `getReady`, types and `createClient` are exported. Use an isolated client rather than shared mutable global configuration:

```ts
import { createClient, getHello } from '@helicraft/alhena';
const client = createClient({ baseUrl: 'http://localhost:3000' });
const { data } = await getHello({ client, query: { name: 'Vega' }, throwOnError: true });
console.log(data.message);
```

The transport uses Fetch, supports cancellation and throws when `throwOnError` is requested. Types do not validate remote payloads at runtime; Vega validates its greeting with Zod. Eventually this internal SDK can support public integrations, bots, analytics and automation.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

γ Geminorum, in the constellation Gemini. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
