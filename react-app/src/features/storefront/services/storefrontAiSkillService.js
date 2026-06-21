import { toTrimmedString } from '../../../common/utils/text';
import { normalizeStorefrontEditPolicy } from '../model/storefrontAiDesignModel';
import storefrontDesignSkillMarkdown from '../ai-design-skill/SKILL.md?raw';
import storefrontEditableRegionsMarkdown from '../ai-design-skill/references/editable-regions.md?raw';
import storefrontExamplesMarkdown from '../ai-design-skill/references/examples.md?raw';
import storefrontFieldGroupingRulesMarkdown from '../ai-design-skill/references/field-grouping-rules.md?raw';
import storefrontOutputContractMarkdown from '../ai-design-skill/references/output-contract.md?raw';
import storefrontScopeModelMarkdown from '../ai-design-skill/references/scope-model.md?raw';

const SKILL_PACKS = {
  'base-system': {
    id: 'base-system',
    instructions: [
      'You are an AI storefront copilot for an agricultural office product page.',
      'Return only structured storefront design data.',
      'Do not invent product fields or medium categories outside provided options.',
      'Preserve source facts. Change presentation, not raw data.',
    ].join(' '),
  },
  intent: {
    id: 'intent',
    instructions: [
      'Interpret user request into tone, audience, goal, and priority.',
      'Prefer clear shopper-facing language.',
      'Keep office/product category fixed.',
    ].join(' '),
  },
  transform: {
    id: 'transform',
    instructions: [
      'Group related fields only when policy allows semantic grouping.',
      'Prefer inline comparison for two price-like fields.',
      'Hide empty secondary fields before removing important pricing facts.',
    ].join(' '),
  },
  layout: {
    id: 'layout',
    instructions: [
      'Choose card structure for mobile readability first.',
      'Use image-left or price-focus layouts when request emphasizes comparison or scanning speed.',
    ].join(' '),
  },
  style: {
    id: 'style',
    instructions: [
      'Set title tone, typography tone, spacing, accent, and price emphasis.',
      'Favor trustworthy agricultural-office presentation over flashy decoration.',
    ].join(' '),
  },
  policy: {
    id: 'policy',
    instructions: [
      'Never violate editPolicy.',
      'If label rewrite is not allowed, keep labels close to source labels.',
      'If confidence is low, choose conservative structure.',
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
      'Keep product_name and price near top of card.',
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

const STOREFRONT_FORCED_REFERENCE_PROMPT = [
  'Always consult the bundled local storefront design-edit skill below before interpreting the user request.',
  'Treat these references as mandatory constraints for every request, not optional hints.',
  '',
  storefrontDesignSkillMarkdown,
  storefrontScopeModelMarkdown,
  storefrontFieldGroupingRulesMarkdown,
  storefrontEditableRegionsMarkdown,
  storefrontOutputContractMarkdown,
  storefrontExamplesMarkdown,
]
  .map((part) => toTrimmedString(part))
  .filter(Boolean)
  .join('\n\n');

export function selectStorefrontAiSkillPackIds({
  productCategoryName,
  editPolicy,
  mode = 'preview',
}) {
  const normalizedPolicy = normalizeStorefrontEditPolicy(editPolicy);
  const categoryName = toTrimmedString(productCategoryName);
  const ids = ['base-system', 'intent', 'layout', 'style', 'policy'];

  if (normalizedPolicy.allowSemanticGrouping) {
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

export function buildStorefrontAiSystemPrompt(activeSkillIds) {
  const runtimeSkillPrompt = (Array.isArray(activeSkillIds) ? activeSkillIds : [])
    .map((id) => SKILL_PACKS[id]?.instructions)
    .filter(Boolean)
    .join('\n\n');

  return [runtimeSkillPrompt, STOREFRONT_FORCED_REFERENCE_PROMPT]
    .map((part) => toTrimmedString(part))
    .filter(Boolean)
    .join('\n\n');
}
