import { toTrimmedString } from '../../../../common/utils/text';
import { CARD_STYLE_SKILL_PROMPT } from './skill/skillPrompt';
import { CARD_STYLE_CONDITIONAL_STYLE_RULES_PROMPT } from './skill/references/conditionalStyleRulesPrompt';
import { CARD_STYLE_EDITABLE_REGIONS_PROMPT } from './skill/references/editableRegionsPrompt';
import { CARD_STYLE_EXAMPLES_PROMPT } from './skill/references/examplesPrompt';
import { CARD_STYLE_FIELD_GROUPING_RULES_PROMPT } from './skill/references/fieldGroupingRulesPrompt';
import { CARD_STYLE_OUTPUT_CONTRACT_PROMPT } from './skill/references/outputContractPrompt';
import { CARD_STYLE_SCOPE_MODEL_PROMPT } from './skill/references/scopeModelPrompt';

const SKILL_PACKS = {
  'base-system': {
    id: 'base-system',
    instructions: [
      'You are an AI card-design copilot for an agricultural office product card.',
      'Return only structured card design data.',
      'Do not invent product fields outside the provided visibleFields.',
      'Preserve source facts. Change presentation, not raw data.',
    ].join(' '),
  },
  intent: {
    id: 'intent',
    instructions: [
      'Interpret the main prompt and each section override prompt independently.',
      'A section override always wins over the main prompt for that section.',
      'A field-level override always wins over both.',
    ].join(' '),
  },
  transform: {
    id: 'transform',
    instructions: [
      'Group related fields only when policy allows semantic grouping.',
      'Prefer inline comparison for two price-like fields.',
      'Never group fields the request did not mention.',
    ].join(' '),
  },
  layout: {
    id: 'layout',
    instructions: [
      'Read the current card style before proposing changes.',
      'Return a structured layout plan for mobile readability first.',
      'Keep the arrangement readable for the chosen cardsPerRow.',
    ].join(' '),
  },
  style: {
    id: 'style',
    instructions: [
      'Set shell, header, image, info, and field styling within their approved properties only.',
      'Favor trustworthy agricultural-office presentation over flashy decoration.',
      'Any text color you choose (e.g. header titleColorHex) must always contrast clearly against its own background color so it stays easily readable. Never pick a text color close to its background.',
    ].join(' '),
  },
  policy: {
    id: 'policy',
    instructions: [
      'Never violate editPolicy.',
      'If confidence is low, choose conservative structure.',
      'Never rewrite the header title text.',
    ].join(' '),
  },
  'publish-safety': {
    id: 'publish-safety',
    instructions: [
      'Assume result may later ship to customer QR.',
      'Do not hide critical product identity or price facts.',
      'Prefer stable, readable structures over risky novelty.',
    ].join(' '),
  },
  'fertilizer-domain': {
    id: 'fertilizer-domain',
    instructions: [
      'For fertilizer products, treat nutrient, spec, subsidy, and price comparison as important sales facts.',
      'Keep product_name and price near the top of the card.',
    ].join(' '),
  },
  'pesticide-domain': {
    id: 'pesticide-domain',
    instructions: [
      'For pesticide products, treat usage, active ingredient, and crop relevance as important context.',
      'Keep product_name and spec visible before secondary notes.',
    ].join(' '),
  },
};

const CARD_DESIGN_FORCED_REFERENCE_PROMPT = [
  'Always consult the bundled local card-design-edit skill below before interpreting the user request.',
  'Treat these references as mandatory constraints for every request, not optional hints.',
  '',
  CARD_STYLE_SKILL_PROMPT,
  CARD_STYLE_SCOPE_MODEL_PROMPT,
  CARD_STYLE_FIELD_GROUPING_RULES_PROMPT,
  CARD_STYLE_CONDITIONAL_STYLE_RULES_PROMPT,
  CARD_STYLE_EDITABLE_REGIONS_PROMPT,
  CARD_STYLE_OUTPUT_CONTRACT_PROMPT,
  CARD_STYLE_EXAMPLES_PROMPT,
]
  .map((part) => toTrimmedString(part))
  .filter(Boolean)
  .join('\n\n');

export function selectCardStyleSkillPackIds({
  productCategoryName,
  allowSemanticGrouping = true,
  mode = 'preview',
}) {
  const categoryName = toTrimmedString(productCategoryName);
  const ids = ['base-system', 'intent', 'layout', 'style', 'policy'];

  if (allowSemanticGrouping) {
    ids.push('transform');
  }

  if (mode === 'publish') {
    ids.push('publish-safety');
  }

  if (categoryName.includes('비료') || categoryName.toLowerCase().includes('fertilizer')) {
    ids.push('fertilizer-domain');
  }

  if (categoryName.includes('농약') || categoryName.toLowerCase().includes('pesticide')) {
    ids.push('pesticide-domain');
  }

  return ids.filter((id, index) => ids.indexOf(id) === index);
}

export function buildCardStyleAiSystemPrompt(activeSkillIds) {
  const runtimeSkillPrompt = (Array.isArray(activeSkillIds) ? activeSkillIds : [])
    .map((id) => SKILL_PACKS[id]?.instructions)
    .filter(Boolean)
    .join('\n\n');

  return [runtimeSkillPrompt, CARD_DESIGN_FORCED_REFERENCE_PROMPT]
    .map((part) => toTrimmedString(part))
    .filter(Boolean)
    .join('\n\n');
}
