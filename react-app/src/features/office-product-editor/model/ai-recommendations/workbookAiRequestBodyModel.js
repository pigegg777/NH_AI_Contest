import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';
import { getAiReviewColumnKeys } from './workbookAiReviewColumns';

// Shared row cap: enforced client-side before the HTTP request is even sent
// (see analyzeWorkbookAiRecommendations) so a large workbook (e.g. a
// pesticide catalog with thousands of rows) never produces a request body
// large enough to be rejected by the server's body-size limit. Also
// enforced again server-side in analyze.js as defense in depth.
export const MAX_WORKBOOK_AI_ROWS = 500;

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
          groupType: {
            type: 'string',
            enum: ['same_product', 'similar_product'],
          },
          title: { type: 'string' },
          reason: { type: 'string' },
          relatedRowIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['groupType', 'title', 'reason', 'relatedRowIds'],
      },
    },
  },
  required: ['recommendations'],
};

const AI_REVIEW_FIELD_SERIALIZERS = {
  row_id: (row) => toTrimmedString(row?.row_id),
  product_code: (row) => toTrimmedString(row?.product_code),
  product_name: (row) => toTrimmedString(row?.product_name),
  spec: (row) => toTrimmedString(row?.spec),
  sale_price_type_name: (row) => toTrimmedString(row?.sale_price_type_name),
  tax_price: (row) => toNumberOrNull(row?.tax_price),
  zero_tax_price: (row) => toNumberOrNull(row?.zero_tax_price),
  exempt_tax_price: (row) => toNumberOrNull(row?.exempt_tax_price),
  note: (row) => toTrimmedString(row?.note),
  medium_category: (row) => toTrimmedString(row?.medium_category),
  small_category: (row) => toTrimmedString(row?.small_category),
  detail_category: (row) => toTrimmedString(row?.detail_category),
  manufacturer_list: (row) =>
    (Array.isArray(row?.manufacturer_list) ? row.manufacturer_list : [])
      .map((manufacturer) => ({
        manufacturer_name: toTrimmedString(manufacturer?.manufacturer_name),
      }))
      .filter((manufacturer) => manufacturer.manufacturer_name !== ''),
  nutrient: (row) => toTrimmedString(row?.nutrient),
  price_subsidy: (row) => toNumberOrNull(row?.price_subsidy),
  img_url: (row) => toTrimmedString(row?.img_url),
  product_url: (row) => toTrimmedString(row?.product_url),
  nutirent: (row) => toTrimmedString(row?.nutirent),
  product_category: (row) => toTrimmedString(row?.product_category),
  indict_symbl: (row) => toTrimmedString(row?.indict_symbl),
  product_usage: (row) =>
    Array.isArray(row?.product_usage)
      ? row.product_usage.map((entry) => ({
          cropName: toTrimmedString(entry?.cropName),
          diseaseWeedName: toTrimmedString(entry?.diseaseWeedName),
          pestiUse: toTrimmedString(entry?.pestiUse),
          dilutUnit: toTrimmedString(entry?.dilutUnit),
          useSuittime: toTrimmedString(entry?.useSuittime),
          useNum: toTrimmedString(entry?.useNum),
        }))
      : [],
};

function serializeWorkbookRow(row, tableNameMode) {
  const keys = ['row_id', ...getAiReviewColumnKeys(tableNameMode)];
  const serializedRow = {};

  for (const key of keys) {
    serializedRow[key] = AI_REVIEW_FIELD_SERIALIZERS[key](row);
  }

  return serializedRow;
}

// Trims each row down to only the fields the AI review actually uses, and
// caps the row count. Meant to be called client-side, before the rows are
// sent over HTTP at all — rows straight from the workbook can carry large
// fields the AI never sees (e.g. a pesticide row's merged product_usage
// array), which otherwise bloats the request body for no benefit and can
// trip the server's body-size limit long before OpenAI is ever called.
export function serializeWorkbookRowsForAiReview(rows, tableNameMode) {
  const normalizedTableNameMode = toTrimmedString(tableNameMode);
  const cappedRows = (Array.isArray(rows) ? rows : []).slice(0, MAX_WORKBOOK_AI_ROWS);

  return cappedRows.map((row) => serializeWorkbookRow(row, normalizedTableNameMode));
}

export function buildWorkbookAiRequestBody({
  rows,
  tableNameMode,
  openAiModel,
  prompt,
  userHint,
}) {
  const normalizedTableNameMode = toTrimmedString(tableNameMode);

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: JSON.stringify({
          analysis_scope: 'all_rows',
          table_name_mode: normalizedTableNameMode,
          user_hint: toTrimmedString(userHint),
          rows: serializeWorkbookRowsForAiReview(rows, normalizedTableNameMode),
        }),
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
    max_output_tokens: 8000,
  };
}
