import { toTrimmedString } from '../../../../common/utils/text';
import { toUniqueStrings } from '../../../../common/utils/array';

const ALLOWED_GROUP_TYPES = new Set(['same_product', 'similar_product']);
const DEFAULT_GROUP_TYPE = 'same_product';

function buildRecommendationId(input) {
  const relatedRowIds = toUniqueStrings(input.relatedRowIds);
  const title = toTrimmedString(input.title);

  return input.id ?? `${title || 'recommendation'}:${relatedRowIds.join(',')}`;
}

function normalizeGroupType(groupType) {
  const normalizedGroupType = toTrimmedString(groupType).toLowerCase();

  return ALLOWED_GROUP_TYPES.has(normalizedGroupType)
    ? normalizedGroupType
    : DEFAULT_GROUP_TYPE;
}

export function createAiRecommendation(input) {
  return {
    id: buildRecommendationId(input),
    groupType: normalizeGroupType(input.groupType),
    title: toTrimmedString(input.title),
    reason: toTrimmedString(input.reason),
    relatedRowIds: toUniqueStrings(input.relatedRowIds),
  };
}
