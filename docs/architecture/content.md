[Русский](content_RU.md) | [Repository](../../README.md)

# Editorial content

PAGE and CHRONICLE share content_documents, but expose separate typed API collections and routes. Strict DTOs validate slug, title, description, Markdown, optional SEO overrides, category and featured flag. The lifecycle is DRAFT → PUBLISHED, with explicit unpublish and ARCHIVED operations. New documents start private. Public readers query PUBLISHED only. Administrative readers require content.read; preview/save/create/restore require content.write; publication transitions require content.publish.

Markdown uses unified, remark-parse/GFM, rehype-slug and rehype-sanitize. Raw HTML is disabled; dangerous links and attributes are filtered. Heading IDs receive a safe prefix against DOM clobbering. Stored source is editable; generated HTML is never accepted from the client. Only sanitized server output enters Atria MarkdownContent. Paragraphs, headings, lists, tables, blockquotes, links and code have editorial styling.

Every create/save adds an immutable content_revisions snapshot and audit record. Restore writes a new revision through the same validation and save path. Slug changes after publication retain redirect records; old slugs resolve only while the target is public. Reserved old slugs cannot silently be reassigned to a different document. Featured chronicle replacement is serialized and also creates a revision/audit row for displaced items. Publication state changes are audited separately from source revisions.

The editor has fields, server-sanitized preview, dirty navigation protection, save/publish/unpublish/archive and revision restore. Public chronicle lists paginate; the home page requests four real entries and displays an honest empty state when none exist. Rules/start can use published CMS pages with static introductory fallback when no page exists. Canonical metadata and sitemap follow real published slugs. A full media manager, page builder, scheduled publishing and workflow approvals are out of scope. Source revisions contain editorial content and are retained rather than automatically purged.
