import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

const pipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug, { prefix: 'hc-heading-' })
  .use(rehypeSanitize)
  .use(rehypeStringify);
async function renderMarkdown(markdown: string): Promise<string> {
  const html = await pipeline.process(markdown);
  return String(html);
}

export { renderMarkdown };
