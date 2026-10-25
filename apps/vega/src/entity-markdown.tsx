import { createElement, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { PlayerNickname } from './player-nickname';
import { CompanyName } from './company-name';
import { StateName } from './state-name';
import styles from './entity-markdown.module.scss';

type HtmlNode = DefaultTreeAdapterMap['node'];
function textContent(node: HtmlNode): string {
  if ('value' in node) {
    return node.value;
  }
  return 'childNodes' in node ? node.childNodes.map(textContent).join('') : '';
}
const reactAttributes: Readonly<Record<string, string>> = {
  class: 'className',
  for: 'htmlFor',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  tabindex: 'tabIndex',
};
const booleanAttributes = new Set(['checked', 'disabled', 'multiple', 'selected']);
function renderEntityLink(href: string, name: string, key: string): ReactNode {
  const player = /^\/players\/(?<id>[0-9a-f-]{36})$/u.exec(href);
  if (player?.groups?.id !== undefined && name !== '') {
    return <PlayerNickname key={key} id={player.groups.id} name={name} />;
  }
  const state = /^\/states\/(?<slug>[a-z0-9-]+)$/u.exec(href);
  if (state?.groups?.slug !== undefined && name !== '') {
    return (
      <StateName
        key={key}
        href={href}
        slug={state.groups.slug}
        color="var(--primary)"
        name={name}
      />
    );
  }
  const company = /^\/companies\/(?<id>[0-9a-f-]{36})$/u.exec(href);
  if (company?.groups?.id !== undefined && name !== '') {
    return <CompanyName key={key} id={company.groups.id} name={name} />;
  }
  return null;
}
function renderNode(node: HtmlNode, key: string): ReactNode {
  if ('value' in node) {
    return node.value;
  }
  if (!('tagName' in node)) {
    return null;
  }
  const attributes = Object.fromEntries(
    node.attrs.map((attribute) => [
      reactAttributes[attribute.name] ?? attribute.name,
      booleanAttributes.has(attribute.name) ? true : attribute.value,
    ]),
  );
  const { href: rawHref } = attributes;
  const href = typeof rawHref === 'string' ? rawHref : undefined;
  if (node.tagName === 'a' && href !== undefined) {
    const entity = renderEntityLink(href, textContent(node).trim(), key);
    if (entity !== null) {
      return entity;
    }
  }
  const children = node.childNodes.map((child, position): ReactNode =>
    renderNode(child, `${key}.${position}`),
  );
  return createElement(
    node.tagName,
    { ...attributes, key },
    children.length === 0 ? undefined : children,
  );
}
function EntityMarkdown({ html }: Readonly<{ html: string }>): ReactElement {
  // Only Antares-sanitized HTML enters this renderer; parsing adds entity components without evaluating source HTML.
  const content = useMemo(
    () =>
      parseFragment(html).childNodes.map((node, position): ReactNode =>
        renderNode(node, String(position)),
      ),
    [html],
  );
  return <div className={styles.document}>{content}</div>;
}
export { EntityMarkdown };
