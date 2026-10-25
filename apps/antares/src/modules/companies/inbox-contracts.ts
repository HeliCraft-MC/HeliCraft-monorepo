import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const CompanyInboxKindSchema = z.enum([
  'FORMATION',
  'REGISTRATION',
  'STATE_DECISION',
  'COMPANY_DECISION',
  'SHARES',
]);
const CompanyInboxItemSchema = z.object({
  id: z.string(),
  title: LocalizedInputSchema,
  href: z.string(),
  action: z.string(),
});
const CompanyInboxPageSchema = z
  .object({ items: z.array(CompanyInboxItemSchema), nextId: z.uuid().nullable() })
  .openapi('CompanyInboxPage');
type CompanyInboxItem = z.infer<typeof CompanyInboxItemSchema>;
type CompanyInboxKind = z.infer<typeof CompanyInboxKindSchema>;
type CompanyInboxPage = z.infer<typeof CompanyInboxPageSchema>;
export {
  CompanyInboxKindSchema,
  CompanyInboxPageSchema,
  type CompanyInboxItem,
  type CompanyInboxKind,
  type CompanyInboxPage,
};
