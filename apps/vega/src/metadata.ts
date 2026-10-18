import { DEFAULT_SERVER_NAME, brandText } from './site-branding';
import { locales } from './locales';
import type { Locale } from './locales';
import type { PublicContent } from '@helicraft/alhena';

interface MetadataOptions {
  readonly locale?: Locale;
  readonly title: string;
  readonly serverName?: string;
  readonly description: string;
  readonly path: string;
  readonly origin: string;
  readonly noindex?: boolean;
  readonly article?: PublicContent;
}
interface MetadataResult {
  readonly meta: { title?: string; name?: string; content?: string; property?: string }[];
  readonly links: { rel: string; href: string; hrefLang?: string }[];
  readonly scripts: { type: string; children: string }[];
}
function languageUrl(options: MetadataOptions, language: string): string {
  const url = new URL(options.path, options.origin);
  url.searchParams.set('lang', language);
  return url.href;
}
function alternateLanguages(options: MetadataOptions): MetadataResult['links'] {
  return Object.keys(locales).map((code) => {
    const url = new URL(options.path, options.origin);
    url.searchParams.set('lang', code);
    return { rel: 'alternate', hrefLang: code, href: url.href };
  });
}
function metadata(options: MetadataOptions): MetadataResult {
  const serverName = options.serverName ?? DEFAULT_SERVER_NAME;
  const title = `${brandText(options.title, serverName)} · ${serverName}`;

  const canonical = languageUrl(options, options.locale ?? 'ru');
  return {
    meta: [
      { title },
      { name: 'description', content: brandText(options.description, serverName) },
      { name: 'robots', content: options.noindex === true ? 'noindex, nofollow' : 'index, follow' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: brandText(options.description, serverName) },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: options.article === undefined ? 'website' : 'article' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...alternateLanguages(options),
      { rel: 'alternate', hrefLang: 'x-default', href: new URL(options.path, options.origin).href },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          options.article === undefined
            ? {
                '@context': 'https://schema.org',
                inLanguage: options.locale ?? 'ru',
                '@type': options.path === '/' ? 'WebSite' : 'WebPage',
                name: title,
                description: brandText(options.description, serverName),
                url: canonical,
              }
            : {
                '@context': 'https://schema.org',
                '@type': 'Article',
                inLanguage: options.locale ?? 'ru',
                headline: options.article.title,
                description: brandText(options.description, serverName),
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
