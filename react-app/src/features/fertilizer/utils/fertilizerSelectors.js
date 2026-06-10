import { toLowerTrimmedString, toTrimmedString } from '../../../common/utils/text';

const FERTILIZER_CATEGORY_ORDER = Object.freeze([
  '질소',
  '복합',
  '유기질',
  '칼리',
]);

const FERTILIZER_CATEGORY_RANK = new Map(
  FERTILIZER_CATEGORY_ORDER.map((category, index) => [category, index]),
);

function getCategoryRank(category) {
  return FERTILIZER_CATEGORY_RANK.get(toTrimmedString(category)) ?? Number.MAX_SAFE_INTEGER;
}

function sortCategories(categories) {
  const uniqueCategories = Array.from(new Set(categories.filter(Boolean)));
  const ordered = FERTILIZER_CATEGORY_ORDER.filter((category) => uniqueCategories.includes(category));
  const remaining = uniqueCategories.filter((category) => !FERTILIZER_CATEGORY_RANK.has(category));

  return [...ordered, ...remaining];
}

function sortItemsByCategoryOrder(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const rankDiff = getCategoryRank(left.item?.fertilizerType) - getCategoryRank(right.item?.fertilizerType);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function getFertilizerListViewModel(data = []) {
  const items = sortItemsByCategoryOrder(data);
  const categories = sortCategories(items.map((item) => item?.fertilizerType));

  return { items, categories };
}

export function filterFertilizerItems(items, category, query) {
  const keyword = toLowerTrimmedString(query);

  return sortItemsByCategoryOrder(
    items.filter((item) => {
      const categoryMatch = category === '전체' || item?.fertilizerType === category;
      const queryMatch =
        !keyword ||
        toLowerTrimmedString(
          `${item?.productName || ''} ${item?.fertilizerType || ''} ${item?.featureSummary || ''}`,
        ).includes(keyword);

      return categoryMatch && queryMatch;
    }),
  );
}
