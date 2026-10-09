import type { PublicContent } from '@helicraft/alhena';

interface MetadataOptions {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly origin: string;
  readonly noindex?: boolean;
  readonly article?: PublicContent;
}
interface MetadataResult {
  readonly meta: { title?: string; name?: string; content?: string; property?: string }[];
  readonly links: { rel: string; href: string }[];
  readonly scripts: { type: string; children: string }[];
}
function metadata(options: MetadataOptions): MetadataResult {
  const title = `${options.title} · HeliCraft`;
  const canonical = new URL(options.path, options.origin).href;
  return {
    meta: [
      { title },
      { name: 'description', content: options.description },
      { name: 'robots', content: options.noindex === true ? 'noindex, nofollow' : 'index, follow' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: options.article === undefined ? 'website' : 'article' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: canonical }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          options.article === undefined
            ? {
                '@context': 'https://schema.org',
                '@type': options.path === '/' ? 'WebSite' : 'WebPage',
                name: title,
                description: options.description,
                url: canonical,
              }
            : {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: options.article.title,
                description: options.description,
                datePublished: options.article.publishedAt,
                dateModified: options.article.updatedAt,
                author: { '@type': 'Person', name: options.article.author },
                mainEntityOfPage: canonical,
              },
        ).replaceAll('<', '\u003C'),
      },
    ],
  };
}
export { metadata, type MetadataOptions };
