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

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

const STOREFRONT_AI_SCHEMA = {
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
          items: { type: 'string', enum: STOREFRONT_FIELD_OPTIONS },
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
      },
      required: [
        'designDirection',
        'selectedMediumCategories',
        'representativeMediumCategory',
        'cardFields',
        'cardStyle',
        'navConfig',
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
    throw new Error(`OpenAI API request failed with status ${response.status}.`);
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

function detectFields(prompt) {
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

  return normalizeCardFields(fields.length > 1 ? fields : DEFAULT_CARD_FIELDS);
}

function normalizeSelectedMediumCategories(selectedMediumCategories, mediumCategoryOptions) {
  const options = Array.isArray(mediumCategoryOptions) ? mediumCategoryOptions : [];
  const candidateValues = Array.isArray(selectedMediumCategories) ? selectedMediumCategories : [];
  const normalized = candidateValues.filter(
    (value, index) => options.includes(value) && candidateValues.indexOf(value) === index,
  );

  return normalized.length > 0 ? normalized : options;
}

function buildHeuristicSuggestion({ prompt, mediumCategoryOptions, currentDraft }) {
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
      cardFields: detectFields(prompt),
      cardStyle: normalizeCardStyle({
        layout: detectLayout(prompt),
        accentColor,
        fontSize: detectFontSize(prompt),
        cardsPerRow: detectCardsPerRow(prompt),
        imageSize: DEFAULT_CARD_STYLE.imageSize,
        imageFit: DEFAULT_CARD_STYLE.imageFit,
        cardRadius: DEFAULT_CARD_STYLE.cardRadius,
        cardShadow: DEFAULT_CARD_STYLE.cardShadow,
        cardSpacing: DEFAULT_CARD_STYLE.cardSpacing,
      }),
      navConfig: normalizeNavConfig({
        title: `${primaryLabel} Guide`,
        subtitle: 'AI-generated draft for the storefront',
        brandColor: accentColor,
        searchPlaceholder: `Search ${String(primaryLabel).toLowerCase()}`,
        logoUrl: currentDraft?.navConfig?.logoUrl ?? '',
        searchVariant: currentDraft?.navConfig?.searchVariant,
        categoryChipVariant: currentDraft?.navConfig?.categoryChipVariant,
      }),
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

export function normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions) {
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
      cardFields: normalizeCardFields(patch.cardFields),
      cardStyle: normalizeCardStyle(patch.cardStyle),
      navConfig: normalizeNavConfig(patch.navConfig),
    },
  };
}

export async function requestStorefrontAiSuggestion({ prompt, mediumCategoryOptions, currentDraft }) {
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

  return normalizeStorefrontAiSuggestion(payload, mediumCategoryOptions);
}
