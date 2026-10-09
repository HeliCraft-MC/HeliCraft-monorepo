[Русский](landing-page_RU.md) | [Repository](../../README.md)

# Landing page design

The landing presents HeliCraft as a persistent Minecraft world shaped by people, with independent play as a complete choice. The authoritative game design remains docs/GDD; future states, economy and political systems are described as direction rather than released features. PRELAUNCH is the default. No online counts, invented players, synthetic publications or fictional world events are seeded into the product.

The page has seven editorial chapters: hero with a clearly conceptual authored atlas illustration; actual chronicle; ways to participate; activities and roles; collective memory; practical onboarding; FAQ. A warm charcoal/cream/amber palette, Onest text and IBM Plex Mono labels, generous reading widths and asymmetric desktop layout distinguish it from a plugin catalogue. Mobile chapters stack and controls remain usable at 360/390px; reduced motion and visible focus states are shared UI conventions. Fonts are bundled locally rather than downloaded at runtime.

The atlas is an original SVG concept, not a screenshot or a live territorial map. Chronicle failures and empty data have distinct honest states. Server address appears only when OPEN and configured; registration state comes from the backend. Real community links must be supplied rather than invented. The shell has accessible navigation, skip link, account entry and responsive menu. Public home HTML contains useful content before client JavaScript runs.

Reusable components and tokens belong to Atria; landing composition and copy belong to Vega. Storybook covers forms, feedback, editorial content, overlays and button states. Skin avatars belong to accounts and use the Minecraft head pipeline. Playwright covers responsive widths and key journeys; desktop/mobile screenshots were visually inspected during this foundation. Further illustration work can replace the conceptual atlas with real licensed world imagery after the world exists.

COMMUNITY_LINKS is an optional JSON array of `{ "label": "...", "url": "https://..." }`. Only actual HTTP(S) addresses should be configured. The public footer includes these links and up to 50 published CMS pages; public navigation loads without credentials during SSR.
