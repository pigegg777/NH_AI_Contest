import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';

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

function serializeWorkbookRow(row) {
  return {
    row_id: toTrimmedString(row?.row_id),
    product_code: toTrimmedString(row?.product_code),
    product_name: toTrimmedString(row?.product_name),
    nutrient: toTrimmedString(row?.nutrient),
    product_nutirent: toTrimmedString(row?.product_nutirent),
    spec: toTrimmedString(row?.spec),
    sale_price_type_code: toTrimmedString(row?.sale_price_type_code),
    sale_price_type_name: toTrimmedString(row?.sale_price_type_name),
    tax_price: toNumberOrNull(row?.tax_price),
    zero_tax_price: toNumberOrNull(row?.zero_tax_price),
    exempt_tax_price: toNumberOrNull(row?.exempt_tax_price),
    price_subsidy: toNumberOrNull(row?.price_subsidy),
    note: toTrimmedString(row?.note),
    medium_category: toTrimmedString(row?.medium_category),
    small_category: toTrimmedString(row?.small_category),
    detail_category: toTrimmedString(row?.detail_category),
    img_url: toTrimmedString(row?.img_url),
    product_url: toTrimmedString(row?.product_url),
    product_category: toTrimmedString(row?.product_category),
    indict_symbl: toTrimmedString(row?.indict_symbl),
    product_usage: Array.isArray(row?.product_usage)
      ? row.product_usage.map((entry) => ({
          cropName: toTrimmedString(entry?.cropName),
          diseaseWeedName: toTrimmedString(entry?.diseaseWeedName),
          pestiUse: toTrimmedString(entry?.pestiUse),
          dilutUnit: toTrimmedString(entry?.dilutUnit),
          useSuittime: toTrimmedString(entry?.useSuittime),
          useNum: toTrimmedString(entry?.useNum),
        }))
      : [],
    manufacturer_list: (Array.isArray(row?.manufacturer_list)
      ? row.manufacturer_list
      : []
    )
      .map((manufacturer) => ({
        manufacturer_name: toTrimmedString(manufacturer?.manufacturer_name),
      }))
      .filter((manufacturer) => manufacturer.manufacturer_name !== ''),
    warnings: Array.isArray(row?.warnings)
      ? row.warnings.map((warning) => toTrimmedString(warning)).filter(Boolean)
      : [],
  };
}

export function buildWorkbookAiRequestBody({
  rows,
  tableNameMode,
  openAiModel,
  prompt,
}) {
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
          table_name_mode: toTrimmedString(tableNameMode),
          rows: rows.map(serializeWorkbookRow),
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
    max_output_tokens: 1600,
  };
}
