import { z } from 'zod';
import type { AdminContent } from '@helicraft/alhena';
import type { ContentInput } from './editor-api';

const categories = ['Мир', 'Сообщество', 'Строительство', 'События', 'Обновления проекта'] as const;
const categorySchema = z.enum(categories);
const initial: ContentInput = {
  title: '',
  slug: '',
  description: '',
  markdown: '',
  seoTitle: null,
  seoDescription: null,
  category: 'Обновления проекта',
  isFeatured: false,
};
function inputFrom(record: AdminContent | undefined): ContentInput {
  return record === undefined
    ? initial
    : {
        title: record.title,
        slug: record.slug,
        description: record.description,
        markdown: record.markdown,
        seoTitle: record.seoTitle,
        seoDescription: record.seoDescription,
        category: categorySchema.parse(record.category),
        isFeatured: record.isFeatured,
      };
}
export { categories, categorySchema, inputFrom };
