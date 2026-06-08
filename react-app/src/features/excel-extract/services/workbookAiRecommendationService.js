import {
  buildRuleBasedAiRecommendations,
  createAiRecommendation,
} from '../model/workbook-review/recommendations';
import { toTrimmedString } from '../../../common/utils/text';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
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
          kind: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          title: { type: 'string' },
          reason: { type: 'string' },
          actionText: { type: 'string' },
          relatedRowIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['kind', 'severity', 'title', 'reason', 'actionText', 'relatedRowIds'],
      },
    },
  },
  required: ['recommendations'],
};
const WORKBOOK_AI_ANALYSIS_PROMPT = `
You review extracted workbook rows for an agricultural sales-price workflow.

Follow these rules:
- Do not modify the workbook data.
- Do not invent row IDs, product codes, prices, or manufacturers.
- Use only facts that can be supported by the provided rows and rule-based findings.
- Write title, reason, and actionText in Korean.
- Keep each recommendation concise and practical.
- Use exact row_id values from the input.
- Return an empty recommendations array when there is no meaningful recommendation.

Focus on these recommendation types:
1. same-product-different-code
   - Product name, nutrient, spec, and manufacturer look like the same product, but product codes differ.
2. zero-tax-higher-than-tax
   - zero_tax_price is higher than tax_price. Treat this as high severity.
3. same-product-price-mismatch
   - Product name, nutrient, spec, and manufacturer look like the same product, but tax_price or zero_tax_price values differ.
4. same-code-inconsistent-info
   - The same product_code appears with conflicting product_name, nutrient, or spec values.

Do not propose direct edits. Recommend what the user should verify.
`.trim();
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
      (manufacturer) => manufacturer.manufacturer_code !== '' || manufacturer.manufacturer_name !== '',
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

function serializeRuleRecommendation(recommendation) {
  return {
    kind: recommendation.kind,
    severity: recommendation.severity,
    title: recommendation.title,
    reason: recommendation.reason,
    actionText: recommendation.actionText,
    relatedRowIds: recommendation.relatedRowIds,
  };
}

function buildWorkbookAiRequest(rows, ruleBasedRecommendations, config) {
  return {
    model: config.openAiModel || DEFAULT_OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: WORKBOOK_AI_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            analysis_scope: 'all_rows',
            rows: rows.map(serializeWorkbookRow),
            rule_based_findings: ruleBasedRecommendations.map(serializeRuleRecommendation),
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

function buildRecommendationMergeKey(recommendation) {
  return `${recommendation.kind}:${[...recommendation.relatedRowIds].sort().join(',')}`;
}

function sortRecommendations(recommendations) {
  return [...recommendations].sort((left, right) => {
    const leftPriority = SEVERITY_PRIORITY[left.severity] ?? 99;
    const rightPriority = SEVERITY_PRIORITY[right.severity] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title, 'ko-KR');
  });
}

function mergeRecommendations(ruleBasedRecommendations, openAiRecommendations) {
  const merged = new Map();

  ruleBasedRecommendations.forEach((recommendation) => {
    merged.set(buildRecommendationMergeKey(recommendation), recommendation);
  });

  openAiRecommendations.forEach((recommendation) => {
    const mergeKey = buildRecommendationMergeKey(recommendation);
    const existingRecommendation = merged.get(mergeKey);

    merged.set(
      mergeKey,
      createAiRecommendation({
        ...existingRecommendation,
        ...recommendation,
        relatedRowIds:
          recommendation.relatedRowIds.length > 0
            ? recommendation.relatedRowIds
            : existingRecommendation?.relatedRowIds ?? [],
      }),
    );
  });

  return sortRecommendations([...merged.values()]);
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

function extractStructuredPayload(responseBody) {
  if (responseBody && typeof responseBody.output_parsed === 'object') {
    return responseBody.output_parsed;
  }

  const directOutput = parseJsonCandidate(responseBody?.output_text);

  if (directOutput) {
    return directOutput;
  }

  if (!Array.isArray(responseBody?.output)) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (contentItem && typeof contentItem === 'object' && contentItem.json) {
        return contentItem.json;
      }

      const nestedOutput =
        parseJsonCandidate(contentItem?.text) ??
        parseJsonCandidate(contentItem?.output_text) ??
        parseJsonCandidate(contentItem?.value);

      if (nestedOutput) {
        return nestedOutput;
      }
    }
  }

  return null;
}

async function readOpenAiError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // Ignore JSON parsing errors and try plain text next.
  }

  try {
    const text = await response.text();

    return toTrimmedString(text);
  } catch {
    return '';
  }
}

function normalizeOpenAiRecommendations(recommendations, validRowIds) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations
    .map((recommendation) => createAiRecommendation(recommendation))
    .map((recommendation) => ({
      ...recommendation,
      relatedRowIds: recommendation.relatedRowIds.filter((rowId) => validRowIds.has(rowId)),
    }))
    .filter(
      (recommendation) =>
        recommendation.kind !== '' &&
        recommendation.title !== '' &&
        recommendation.reason !== '' &&
        recommendation.relatedRowIds.length > 0,
    );
}

async function analyzeWorkbookAiRecommendationsWithOpenAi(rows, config, ruleBasedRecommendations) {
  const requestBody = buildWorkbookAiRequest(rows, ruleBasedRecommendations, config);

  // This remains a browser-direct call because the current app has no server proxy yet.
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const openAiErrorMessage = await readOpenAiError(response);
    throw new Error(
      openAiErrorMessage
        ? `OpenAI API request failed: ${openAiErrorMessage}`
        : `OpenAI API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();

  if (responseBody?.refusal) {
    throw new Error(
      `OpenAI refused the request: ${toTrimmedString(responseBody.refusal) || 'unknown reason'}`,
    );
  }

  const structuredPayload = extractStructuredPayload(responseBody);

  if (!structuredPayload || !Array.isArray(structuredPayload.recommendations)) {
    throw new Error('OpenAI returned an unreadable structured response.');
  }

  const validRowIds = new Set(rows.map((row) => toTrimmedString(row?.row_id)).filter(Boolean));
  const openAiRecommendations = normalizeOpenAiRecommendations(
    structuredPayload.recommendations,
    validRowIds,
  );

  return {
    mode: 'openai',
    recommendations: mergeRecommendations(ruleBasedRecommendations, openAiRecommendations),
  };
}

function resolveWorkbookAiConfig(env = import.meta.env) {
  const openAiModel = toTrimmedString(env?.VITE_OPENAI_MODEL);

  return {
    openAiApiKey: toTrimmedString(env?.VITE_OPENAI_API_KEY),
    openAiModel: openAiModel || DEFAULT_OPENAI_MODEL,
  };
}

export async function analyzeWorkbookAiRecommendations(rows, config = resolveWorkbookAiConfig()) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const ruleBasedRecommendations = buildRuleBasedAiRecommendations(safeRows);

  if (safeRows.length === 0 || !config.openAiApiKey) {
    return {
      mode: 'mock',
      recommendations: sortRecommendations(ruleBasedRecommendations),
    };
  }

  return analyzeWorkbookAiRecommendationsWithOpenAi(safeRows, config, ruleBasedRecommendations);
}
