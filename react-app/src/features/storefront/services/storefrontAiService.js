import { toTrimmedString } from '../../../common/utils/text';
import {
  DEFAULT_CARD_FIELDS,
  DEFAULT_NAV_CONFIG,
  STOREFRONT_DESIGN_DIRECTIONS,
  STOREFRONT_FIELD_OPTIONS,
  normalizeCardFields,
  normalizeNavConfig,
} from '../model/storefrontBuilderModel';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../model/cardStyleModel';
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  DEFAULT_MOBILE_UI_TREE,
  MOBILE_UI_BLOCK_TYPES,
  MOBILE_UI_SLOTS,
  normalizeCardElementConfig,
  normalizeMobileUiTree,
} from '../model/storefrontUiModel';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

export const STOREFRONT_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    patch: {
      type: 'object',
      additionalProperties: false,
      properties: {
        designDirection: {
          type: 'string',
          enum: STOREFRONT_DESIGN_DIRECTIONS.map((option) => option.id),
        },
        selectedMediumCategories: {
          type: 'array',
          items: { type: 'string' },
        },
        representativeMediumCategory: { type: 'string' },
        cardFields: {
          type: 'array',
          items: { type: 'string' },
        },
        cardStyle: {
          type: 'object',
          additionalProperties: false,
          properties: {
            layout: { type: 'string', enum: ['grid', 'compact'] },
            accentColor: { type: 'string' },
            fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
            cardsPerRow: { type: 'number', enum: [1, 2, 3] },
            imageSize: { type: 'string', enum: ['hidden', 'sm', 'md', 'lg'] },
            imageFit: { type: 'string', enum: ['cover', 'contain'] },
            cardRadius: { type: 'string', enum: ['md', 'lg', 'xl'] },
            cardShadow: { type: 'string', enum: ['none', 'soft', 'strong'] },
            cardSpacing: { type: 'string', enum: ['tight', 'normal', 'relaxed'] },
          },
          required: [
            'layout',
            'accentColor',
            'fontSize',
            'cardsPerRow',
            'imageSize',
            'imageFit',
            'cardRadius',
            'cardShadow',
            'cardSpacing',
          ],
        },
        navConfig: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            brandColor: { type: 'string' },
            searchPlaceholder: { type: 'string' },
            logoUrl: { type: 'string' },
            searchVariant: { type: 'string', enum: ['pill', 'outlined', 'soft'] },
            categoryChipVariant: { type: 'string', enum: ['filled', 'outline', 'soft'] },
          },
          required: [
            'title',
            'subtitle',
            'brandColor',
            'searchPlaceholder',
            'logoUrl',
            'searchVariant',
            'categoryChipVariant',
          ],
        },
        mobileUiTree: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: MOBILE_UI_BLOCK_TYPES },
              slot: { type: 'string', enum: MOBILE_UI_SLOTS },
              enabled: { type: 'boolean' },
              props: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string' },
                  text: { type: 'string' },
                  label: { type: 'string' },
                  href: { type: 'string' },
                },
                required: ['title', 'text', 'label', 'href'],
              },
            },
            required: ['id', 'type', 'slot', 'enabled', 'props'],
          },
        },
        cardElementConfig: {
          type: 'object',
          additionalProperties: false,
          properties: {
            showImage: { type: 'boolean' },
            showProductName: { type: 'boolean' },
            showSpec: { type: 'boolean' },
            showNutrient: { type: 'boolean' },
            showPrice: { type: 'boolean' },
            showBadge: { type: 'boolean' },
            imageSize: { type: 'string', enum: ['hidden', 'sm', 'md', 'lg'] },
            imageFit: { type: 'string', enum: ['cover', 'contain'] },
            metaDensity: { type: 'string', enum: ['compact', 'comfortable'] },
          },
          required: Object.keys(DEFAULT_CARD_ELEMENT_CONFIG),
        },
        uiChangeSummary: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'designDirection',
        'selectedMediumCategories',
        'representativeMediumCategory',
        'cardFields',
        'cardStyle',
        'navConfig',
        'mobileUiTree',
        'cardElementConfig',
        'uiChangeSummary',
      ],
    },
  },
  required: ['summary', 'patch'],
};

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

  const parsedOutputText = parseJsonCandidate(responseBody?.output_text);

  if (parsedOutputText) {
    return parsedOutputText;
  }

  if (!Array.isArray(responseBody?.output)) {
    return null;
  }

  for (const outputItem of responseBody.output) {
    if (outputItem?.parsed && typeof outputItem.parsed === 'object') {
      return outputItem.parsed;
    }

    const parsedText = parseJsonCandidate(outputItem?.text);

    if (parsedText) {
      return parsedText;
    }

    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (contentItem?.parsed && typeof contentItem.parsed === 'object') {
        return contentItem.parsed;
      }

      const parsedContent = parseJsonCandidate(contentItem?.text);

      if (parsedContent) {
        return parsedContent;
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

async function requestOpenAiSuggestion(requestBody, openAiApiKey) {
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
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
  const structuredPayload = extractStructuredPayload(responseBody);

  if (!structuredPayload) {
    throw new Error('OpenAI returned an unreadable structured response.');
  }

  return structuredPayload;
}

function detectDesignDirection(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('warm') || text.includes('cozy') || text.includes('soft')) {
    return 'warm';
  }

  if (text.includes('green') || text.includes('nature') || text.includes('organic')) {
    return 'green';
  }

  if (text.includes('trust') || text.includes('official') || text.includes('clean')) {
    return 'trust';
  }

  return 'friendly';
}

function detectAccentColor(prompt, designDirection) {
  const text = prompt.toLowerCase();

  if (text.includes('blue')) {
    return '#2563eb';
  }

  if (text.includes('orange')) {
    return '#ea580c';
  }

  if (text.includes('purple')) {
    return '#7c3aed';
  }

  if (designDirection === 'warm') {
    return '#ea580c';
  }

  if (designDirection === 'trust') {
    return '#2563eb';
  }

  return DEFAULT_CARD_STYLE.accentColor;
}

function detectLayout(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('compact') || text.includes('dense')) {
    return 'compact';
  }

  return 'grid';
}

function detectFontSize(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('large') || text.includes('bigger')) {
    return 'large';
  }

  if (text.includes('small') || text.includes('tight')) {
    return 'small';
  }

  return 'medium';
}

function detectCardsPerRow(prompt) {
  const text = prompt.toLowerCase();

  if (
    text.includes('one column') ||
    text.includes('single card') ||
    text.includes('one card per row') ||
    text.includes('focus')
  ) {
    return 1;
  }

  if (text.includes('three') || text.includes('3 per row')) {
    return 3;
  }

  return 2;
}

function detectImageSize(prompt) {
  const text = prompt.toLowerCase();

  if (
    text.includes('hide image') ||
    text.includes('without image') ||
    text.includes('이미지 없이') ||
    text.includes('이미지 숨')
  ) {
    return 'hidden';
  }

  if (
    text.includes('large image') ||
    text.includes('big image') ||
    text.includes('hero image') ||
    text.includes('큰 이미지')
  ) {
    return 'lg';
  }

  if (text.includes('small image') || text.includes('작은 이미지')) {
    return 'sm';
  }

  return DEFAULT_CARD_STYLE.imageSize;
}

function detectImageFit(prompt) {
  const text = prompt.toLowerCase();

  if (
    text.includes('contain') ||
    text.includes('uncropped') ||
    text.includes('잘림 없이') ||
    text.includes('이미지 전체')
  ) {
    return 'contain';
  }

  return DEFAULT_CARD_STYLE.imageFit;
}

function detectCardRadius(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('sharp') || text.includes('square') || text.includes('각진')) {
    return 'md';
  }

  if (text.includes('rounded') || text.includes('round') || text.includes('둥글')) {
    return 'xl';
  }

  return DEFAULT_CARD_STYLE.cardRadius;
}

function detectCardShadow(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('flat') || text.includes('shadowless') || text.includes('그림자 없이')) {
    return 'none';
  }

  if (text.includes('strong shadow') || text.includes('deep shadow') || text.includes('강한 그림자')) {
    return 'strong';
  }

  return DEFAULT_CARD_STYLE.cardShadow;
}

function detectCardSpacing(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('dense') || text.includes('tight') || text.includes('촘촘')) {
    return 'tight';
  }

  if (text.includes('airy') || text.includes('spacious') || text.includes('여백 크게')) {
    return 'relaxed';
  }

  return DEFAULT_CARD_STYLE.cardSpacing;
}

function detectSearchVariant(prompt) {
  const text = prompt.toLowerCase();

  if (
    text.includes('outlined search') ||
    text.includes('outline search') ||
    text.includes('search outline') ||
    text.includes('검색창 테두리')
  ) {
    return 'outlined';
  }

  if (text.includes('soft search') || text.includes('검색창 부드')) {
    return 'soft';
  }

  return DEFAULT_NAV_CONFIG.searchVariant;
}

function detectCategoryChipVariant(prompt) {
  const text = prompt.toLowerCase();

  if (
    text.includes('filled chip') ||
    text.includes('filled tabs') ||
    text.includes('채워진 칩') ||
    text.includes('채운 칩')
  ) {
    return 'filled';
  }

  if (
    text.includes('outline chip') ||
    text.includes('outlined chip') ||
    text.includes('chip outline') ||
    text.includes('칩 테두리')
  ) {
    return 'outline';
  }

  return DEFAULT_NAV_CONFIG.categoryChipVariant;
}

function detectFields(prompt, allowedScalarKeys) {
  const text = prompt.toLowerCase();
  const fields = ['product_name'];

  if (text.includes('spec')) {
    fields.push('spec');
  }

  if (text.includes('nutrient')) {
    fields.push('nutrient');
  }

  if (text.includes('price')) {
    fields.push('tax_price');
  }

  if (text.includes('link') || text.includes('url')) {
    fields.push('product_url');
  }

  return normalizeCardFields(fields.length > 1 ? fields : DEFAULT_CARD_FIELDS, allowedScalarKeys);
}

function normalizeSelectedMediumCategories(selectedMediumCategories, mediumCategoryOptions) {
  const options = Array.isArray(mediumCategoryOptions) ? mediumCategoryOptions : [];
  const candidateValues = Array.isArray(selectedMediumCategories) ? selectedMediumCategories : [];
  const normalized = candidateValues.filter(
    (value, index) => options.includes(value) && candidateValues.indexOf(value) === index,
  );

  return normalized.length > 0 ? normalized : options;
}

function normalizeUiChangeSummary(uiChangeSummary) {
  return (Array.isArray(uiChangeSummary) ? uiChangeSummary : [])
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
}

function buildHeuristicSuggestion({ prompt, mediumCategoryOptions, currentDraft, allowedScalarKeys }) {
  const designDirection = detectDesignDirection(prompt);
  const accentColor = detectAccentColor(prompt, designDirection);
  const selectedMediumCategories = normalizeSelectedMediumCategories(
    currentDraft?.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const representativeMediumCategory = selectedMediumCategories[0] || mediumCategoryOptions[0] || '';
  const primaryLabel = currentDraft?.productCategoryName || representativeMediumCategory || 'Products';

  return {
    summary: `${primaryLabel} draft updated for a ${designDirection} web page.`,
    patch: {
      designDirection,
      selectedMediumCategories,
      representativeMediumCategory,
      cardFields: detectFields(prompt, allowedScalarKeys),
      cardStyle: normalizeCardStyle({
        layout: detectLayout(prompt),
        accentColor,
        fontSize: detectFontSize(prompt),
        cardsPerRow: detectCardsPerRow(prompt),
        imageSize: detectImageSize(prompt),
        imageFit: detectImageFit(prompt),
        cardRadius: detectCardRadius(prompt),
        cardShadow: detectCardShadow(prompt),
        cardSpacing: detectCardSpacing(prompt),
      }),
      navConfig: normalizeNavConfig({
        title: `${primaryLabel} Guide`,
        subtitle: 'AI-generated draft for the storefront',
        brandColor: accentColor,
        searchPlaceholder: `Search ${String(primaryLabel).toLowerCase()}`,
        logoUrl: currentDraft?.navConfig?.logoUrl ?? '',
        searchVariant: detectSearchVariant(prompt),
        categoryChipVariant: detectCategoryChipVariant(prompt),
      }),
      mobileUiTree: normalizeMobileUiTree(currentDraft?.mobileUiTree ?? DEFAULT_MOBILE_UI_TREE),
      cardElementConfig: normalizeCardElementConfig(
        currentDraft?.cardElementConfig ?? {
          showImage: detectImageSize(prompt) !== 'hidden',
          showProductName: true,
          showSpec: true,
          showNutrient: true,
          showPrice: true,
          showBadge: true,
          imageSize: detectImageSize(prompt),
          imageFit: detectImageFit(prompt),
          metaDensity: detectLayout(prompt) === 'compact' ? 'compact' : 'comfortable',
        },
      ),
      uiChangeSummary: [`Apply ${designDirection} storefront presentation update`],
    },
  };
}

function buildOpenAiRequestBody({ prompt, mediumCategoryOptions, currentDraft, openAiModel }) {
  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: [
          'You are an AI storefront copilot for an agricultural office product page.',
          'Return only a valid JSON object that matches the schema.',
          'Do not invent fields or medium categories outside the provided options.',
          'Keep the product category fixed and focus on web-page styling, page tone, and card emphasis.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: prompt,
            currentDraft,
            mediumCategoryOptions,
            designDirectionOptions: STOREFRONT_DESIGN_DIRECTIONS.map((option) => option.id),
            allowedFields: STOREFRONT_FIELD_OPTIONS,
            defaultNavConfig: DEFAULT_NAV_CONFIG,
            allowedMobileUiBlockTypes: MOBILE_UI_BLOCK_TYPES,
            allowedMobileUiSlots: MOBILE_UI_SLOTS,
            defaultMobileUiTree: DEFAULT_MOBILE_UI_TREE,
            defaultCardElementConfig: DEFAULT_CARD_ELEMENT_CONFIG,
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'storefront_ai_suggestion',
        strict: true,
        schema: STOREFRONT_AI_SCHEMA,
      },
    },
    max_output_tokens: 1200,
  };
}

export function normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions, allowedScalarKeys) {
  const patch = payload?.patch ?? {};
  const normalizedSelectedMediumCategories = normalizeSelectedMediumCategories(
    patch.selectedMediumCategories,
    mediumCategoryOptions,
  );
  const requestedRepresentativeMediumCategory = toTrimmedString(patch.representativeMediumCategory);
  const representativeMediumCategory = normalizedSelectedMediumCategories.includes(requestedRepresentativeMediumCategory)
    ? requestedRepresentativeMediumCategory
    : normalizedSelectedMediumCategories[0] || mediumCategoryOptions[0] || '';

  return {
    summary: toTrimmedString(payload?.summary) || 'AI draft applied.',
    patch: {
      designDirection: toTrimmedString(patch.designDirection) || 'friendly',
      selectedMediumCategories: normalizedSelectedMediumCategories,
      representativeMediumCategory,
      cardFields: normalizeCardFields(patch.cardFields, allowedScalarKeys),
      cardStyle: normalizeCardStyle(patch.cardStyle),
      navConfig: normalizeNavConfig(patch.navConfig),
      mobileUiTree: normalizeMobileUiTree(patch.mobileUiTree),
      cardElementConfig: normalizeCardElementConfig(patch.cardElementConfig),
      uiChangeSummary: normalizeUiChangeSummary(patch.uiChangeSummary),
    },
  };
}

export async function requestStorefrontAiSuggestion({ prompt, mediumCategoryOptions, currentDraft, allowedScalarKeys }) {
  const normalizedPrompt = toTrimmedString(prompt);

  if (!normalizedPrompt) {
    throw new Error('Enter an AI request first.');
  }

  const openAiApiKey = toTrimmedString(import.meta.env.VITE_OPENAI_API_KEY);

  if (!openAiApiKey) {
    return buildHeuristicSuggestion({
      prompt: normalizedPrompt,
      mediumCategoryOptions,
      currentDraft,
      allowedScalarKeys,
    });
  }

  const openAiModel = toTrimmedString(import.meta.env.VITE_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  const payload = await requestOpenAiSuggestion(
    buildOpenAiRequestBody({
      prompt: normalizedPrompt,
      mediumCategoryOptions,
      currentDraft,
      openAiModel,
    }),
    openAiApiKey,
  );

  return normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions, allowedScalarKeys);
}
