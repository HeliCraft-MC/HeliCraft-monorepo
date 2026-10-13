[Русский](landing-page_RU.md) | [Repository](../../README.md)

# Landing page design

The public `/` is an editorial view of a persistent world shaped by players. Its composition stays in Vega: photographic hero, thin world-status line, territory/governance/economy/history principles from the GDD, up to three real approved states, a schematic atlas, economy preview and photographic closing invitation. Onest and IBM Plex Mono are bundled locally. Atria supplies warm neutral tokens, accessible controls, StateCard, GalleryTile and PhotoCarousel. Primary is reserved for actions and small accents.

State names, descriptions, flags, citizen counts and directory totals come from published ACTIVE state revisions through Antares/Alhena, without session cookies. Empty and unavailable directories are distinguished. Company/currency previews remain explicitly labelled local typed demonstrations. The atlas is a schematic placeholder, not a territorial map. PRELAUNCH remains the default; only OPEN plus a configured address exposes the Minecraft address. Online is never invented. The GDD describes future gameplay, not shipped systems.

Hero requests one page of at most six public gallery records and the public total without session cookies. A total greater than five selects gallery photographs with actual captions, authors, descriptions/places and detail links. Otherwise, or on API failure, it selects bundled archival photographs with neutral attribution. Image-load failure also replaces the failed image and attribution with an archive fallback. First selection is deterministic during SSR; crossfades start after hydration, run every 12 seconds, pause while the document is hidden and respect reduced motion. Controls can pause or advance. The next image is preloaded; photo layers have fixed geometry. The closing photograph differs from the active hero source.

The sticky header overlays the hero and becomes an opaque warm-neutral surface on scroll. Mobile uses a labelled toggle, expanded state and Escape dismissal. Existing world/chronicle/start/rules, account, configured community and published legal/CMS links remain available; the real `/states` directory, gallery and the archived GitHub organisation are included. No future map route is invented. Public HTML includes content, image captions, navigation and SEO before JavaScript. Protected upload uses the existing CSR account area.

## Archive assets

The following assets were copied from `archive/apps/vesper/public` into active `apps/vega/public/world`; production never imports archive:

| Active asset   | Archive source                               |
| -------------- | -------------------------------------------- |
| `logo.png`     | `logo_noback.png`                            |
| `skyline.webp` | `introImg/photo_2025-05-22_19-05-22.jpg`     |
| `town.webp`    | `introImg/photo_2025-05-20_16-45-41.jpg`     |
| `night.webp`   | `introImg/photo_2023-09-14_21-11-51.jpg`     |
| `forest.webp`  | `introImg/photo_2025-05-21_19-37-34 (2).jpg` |
| `castle.webp`  | `introImg/photo_2025-04-20_23-31-07.jpg`     |

Each photograph has an 800px `-small.webp` variant and a display variant bounded at 2560px. No verified captions were found, so the attribution is “Скриншот игроков HeliCraft / Из архива сообщества”. State cards render actual player-authored structured banner designs or uploaded PNG flags.

See [gallery storage and API](../architecture/gallery.md). Browser smoke tests use test-only gallery fixtures and check SSR, thresholds, failure fallback, 404, hydration and 360–1440px layouts. The separate persistent upload lifecycle uses real disposable PostgreSQL/S3.
