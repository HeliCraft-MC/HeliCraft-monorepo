import { monetaryError } from '../monetary/domain';
import { registeredTaxCategory } from '../taxation/category-registry';
import type { TreatyContent } from './contracts';

interface TreatyTaxScope {
  readonly content: TreatyContent;
  readonly parties: readonly [string, string];
}
function treatyCategoryFor(scope: TreatyTaxScope, stateId: string): string | null {
  if (!scope.parties.includes(stateId)) {
    return null;
  }
  const { category, categoryMapping } = scope.content;
  if (categoryMapping === undefined) {
    return category;
  }
  return scope.parties[0] === stateId
    ? categoryMapping.firstCategory
    : categoryMapping.secondCategory;
}
function overlappingTreatyClaims(left: TreatyTaxScope, right: TreatyTaxScope): boolean {
  return (
    left.content.event === right.content.event &&
    left.parties.some((stateId) => {
      const rightCategory = treatyCategoryFor(right, stateId);
      return rightCategory !== null && treatyCategoryFor(left, stateId) === rightCategory;
    })
  );
}
function assertTreatyCategories(content: TreatyContent, previous?: TreatyContent): void {
  const first = content.categoryMapping?.firstCategory ?? content.category;
  const second = content.categoryMapping?.secondCategory ?? content.category;
  if (
    (content.categoryMapping !== undefined && content.category !== first) ||
    (!registeredTaxCategory(first) &&
      first !== (previous?.categoryMapping?.firstCategory ?? previous?.category)) ||
    (!registeredTaxCategory(second) &&
      second !== (previous?.categoryMapping?.secondCategory ?? previous?.category))
  ) {
    monetaryError(
      'TREATY_CATEGORY_INVALID',
      'Договор должен явно сопоставлять действительные категории реестра обеих сторон',
    );
  }
}
export { treatyCategoryFor, overlappingTreatyClaims, assertTreatyCategories };
