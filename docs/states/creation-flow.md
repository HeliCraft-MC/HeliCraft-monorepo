[Overview](overview.md) | [Localized content](../platform/localized-content.md)

# Resumable creation flow

`/states/new` leads to the protected `/app/states/new` draft list. Drafts are private to their owner, have independent titles and versions, and can be resumed, renamed or soft-deleted. They are not states and never enter public SSR, sitemaps or service-worker data caches.

The wizard steps are basic information, flags, founders, citizenship basics, presets/advanced mode, offices, appointment/term/vacancy rules, citizenship authority, state decisions, voting defaults, optional constitution and review. Steps can be revisited without resetting fields.

The primary founder is the authenticated creator. The shared player picker provides cofounders, excludes duplicate identities and uses the same debounced search as the gallery. All founders become full citizens on initial submission.

Autosave uses a 700 ms debounce, serializes writes and sends the expected server version. The UI reports Saving, Saved or Save failed. A conflict requires reloading the latest version instead of overwriting silently. Incomplete drafts can be saved; numeric policy errors are checked again on submission. Navigation away from unsaved content triggers the browser's standard warning.

The backend revalidates names, slug uniqueness, founder identities, office/policy/generated-block references, voting rules, flags and media ownership. Review distinguishes warnings from blocking errors. Submission materializes the state in a single PostgreSQL transaction, sets CREATED and retains the converted draft.

`/app/states/:id` shows pending configuration to founders. `/admin/states` provides filtering, review, reasoned status decisions and corrections through new revisions. `/states/:slug` serves ACTIVE content in HTML without requiring JavaScript and deliberately sends no session credentials to Antares.

The account draft page also lists the player’s states, including pending and rejected records. Converted drafts remain retrievable but show a link to their resulting state. `/account/states/{id}` and `/admin/states/{id}` and their protected `/flag` routes accept an optional `revisionId`; history access stays protected, and a revision must belong to the requested state. Public routes expose only the current ACTIVE revision and return HTTP 404 for other statuses.

## Flag workspace

The flag step fills the available editor width, with a top switch between the independent vertical banner and horizontal flag. Only the selected design is visible. The workspace contains a proportion-preserving preview, selectable base/layers with thumbnails and keyboard reorder/delete buttons, sixteen named color swatches and all 42 named texture thumbnails. Selecting a pattern adds a layer using the new-pattern color. Selecting a layer allows recoloring; clearing patterns retains the base. The six-layer Minecraft limit is enforced in both editor and backend.

The shared renderer uses the active copy of Vesper's actual banner atlas (`apps/vega/public/banner/patterns.webp`) throughout the editor, review, homepage, directory and public detail. It selects precolored texture cells with their original shading/transparency. There are no handmade pattern paths or SVG gradient approximations. Vertical previews retain 1:2 proportions; horizontal previews rotate to 2:1. PNG previews retain uploaded proportions. Switching horizontal source preserves the alternate design/media during the mounted editing session; only the selected source is persisted in the existing contract.

## Text, guidance and proposals

Every wizard step now explains its relevant decisions and effects. Constitution editing uses a visual/source Markdown document with generated paragraphs, free inline placeholders, a template and debounced sanitized live/fullscreen preview. Turning the formal document off and back on during the editing session retains its text. Review uses the same server-rendered document. `/app/states/:id/proposals` explains the review process, shows an explicit empty state and provides both a create-reform action and a back link.
