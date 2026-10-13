import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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
const constitutionPipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSlug, { prefix: 'hc-heading-' })
  .use(rehypeSanitize)
  .use(rehypeStringify);
async function renderMarkdown(markdown: string): Promise<string> {
  return String(await pipeline.process(markdown));
}
async function renderConstitutionMarkdown(markdown: string): Promise<string> {
  return String(await constitutionPipeline.process(markdown));
}
export { renderMarkdown, renderConstitutionMarkdown };
