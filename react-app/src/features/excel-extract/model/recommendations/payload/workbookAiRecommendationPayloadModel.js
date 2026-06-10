import { toTrimmedString } from '../../../../../common/utils/text';
import { createAiRecommendation } from '../core/aiRecommendationModel';

const OPENAI_RECOMMENDATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          title: { type: 'string' },
          reason: { type: 'string' },
          relatedRowIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['severity', 'title', 'reason', 'relatedRowIds'],
      },
    },
  },
  required: ['recommendations'],
};

const SEVERITY_PRIORITY = {
  high: 0,
  medium: 1,
  low: 2,
};

function toNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializeManufacturers(manufacturerList) {
  if (!Array.isArray(manufacturerList)) {
    return [];
  }

  return manufacturerList
    .map((manufacturer) => ({
      manufacturer_code: toTrimmedString(manufacturer?.manufacturer_code),
      manufacturer_name: toTrimmedString(manufacturer?.manufacturer_name),
    }))
    .filter(
      (manufacturer) =>
        manufacturer.manufacturer_code !== '' || manufacturer.manufacturer_name !== '',
    );
}

function serializeWorkbookRow(row) {
  return {
    row_id: toTrimmedString(row?.row_id),
    product_code: toTrimmedString(row?.product_code),
    product_name: toTrimmedString(row?.product_name),
    nutrient: toTrimmedString(row?.nutrient),
    spec: toTrimmedString(row?.spec),
    sale_price_type_code: toTrimmedString(row?.sale_price_type_code),
    sale_price_type_name: toTrimmedString(row?.sale_price_type_name),
    tax_price: toNumberOrNull(row?.tax_price),
    zero_tax_price: toNumberOrNull(row?.zero_tax_price),
    manufacturer_list: serializeManufacturers(row?.manufacturer_list),
    warnings: Array.isArray(row?.warnings)
      ? row.warnings.map((warning) => toTrimmedString(warning)).filter(Boolean)
      : [],
  };
}

function parseJsonCandidate(candidate) {
  if (typeof candidate !== 'string' || toTrimmedString(candidate) === '') {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractStructuredPayloadFromOutputItem(outputItem) {
  if (!outputItem || typeof outputItem !== 'object') {
    return null;
  }

  if (outputItem.parsed && typeof outputItem.parsed === 'object') {
    return outputItem.parsed;
  }

  const parsedOutputText = parseJsonCandidate(outputItem.text);

  if (parsedOutputText) {
    return parsedOutputText;
  }

  if (!Array.isArray(outputItem.content)) {
    return null;
  }

  for (const contentItem of outputItem.content) {
    if (contentItem?.parsed && typeof contentItem.parsed === 'object') {
      return contentItem.parsed;
    }

    const parsedContentText = parseJsonCandidate(contentItem?.text);

    if (parsedContentText) {
      return parsedContentText;
    }
  }

  return null;
}

function buildRecommendationMergeKey(recommendation) {
  return `${recommendation.title}:${[...recommendation.relatedRowIds].sort().join(',')}`;
}

export function buildWorkbookAiRequestBody({ rows, openAiModel, prompt }) {
  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            analysis_scope: 'all_rows',
            rows: rows.map(serializeWorkbookRow),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'workbook_ai_recommendations',
        strict: true,
        schema: OPENAI_RECOMMENDATION_SCHEMA,
      },
    },
    max_output_tokens: 1600,
  };
}

export function extractWorkbookAiStructuredPayload(responseBody) {
  if (responseBody && typeof responseBody.output_parsed === 'object') {
    return responseBody.output_parsed;
  }

  const parsedOutputText = parseJsonCandidate(responseBody?.output_text);

  if (parsedOutputText) {
    return parsedOutputText;
  }

  if (!Array.isArray(responseBody?.output)) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    const structuredPayload = extractStructuredPayloadFromOutputItem(outputItem);

    if (structuredPayload) {
      return structuredPayload;
    }
  }

  return null;
}

export function normalizeOpenAiRecommendations(recommendations, rows) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  const validRowIds = new Set(rows.map((row) => toTrimmedString(row?.row_id)).filter(Boolean));

  return recommendations
    .map((recommendation) => createAiRecommendation(recommendation))
    .map((recommendation) => ({
      ...recommendation,
      relatedRowIds: recommendation.relatedRowIds.filter((rowId) => validRowIds.has(rowId)),
    }))
    .filter(
      (recommendation) =>
        recommendation.title !== '' &&
        recommendation.reason !== '' &&
        recommendation.relatedRowIds.length > 0,
    );
}

export function sortWorkbookAiRecommendations(recommendations) {
  return [...recommendations].sort((left, right) => {
    const leftPriority = SEVERITY_PRIORITY[left.severity] ?? 99;
    const rightPriority = SEVERITY_PRIORITY[right.severity] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title, 'ko-KR');
  });
}

export function mergeWorkbookAiRecommendations(localRecommendations, openAiRecommendations) {
  const merged = new Map();

  localRecommendations.forEach((recommendation) => {
    merged.set(buildRecommendationMergeKey(recommendation), createAiRecommendation(recommendation));
  });

  openAiRecommendations.forEach((recommendation) => {
    merged.set(buildRecommendationMergeKey(recommendation), createAiRecommendation(recommendation));
  });

  return sortWorkbookAiRecommendations([...merged.values()]);
}
