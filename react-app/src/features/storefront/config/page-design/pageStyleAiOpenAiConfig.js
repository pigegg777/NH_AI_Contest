export const PAGE_STYLE_AI_DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
export const PAGE_STYLE_AI_OPENAI_RESPONSE_FORMAT_NAME =
  'storefront_page_style_suggestion';
export const PAGE_STYLE_AI_OPENAI_MAX_OUTPUT_TOKENS = 800;
export const PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS = [
  'You style one storefront page background palette, header text, category chips, and search box.',
  'Treat the response as an incremental patch over currentPageStyle.',
  'Preserve earlier page-style edits unless the user explicitly changes them.',
  'For every property you do not want to change, return null.',
  'If targetScope is present, only that scope may change. All non-target area objects must be null.',
  'When targetScope is not palette, palette must be null and may not be used as a backdoor to restyle other sections.',
  'Search may only carry sizeToken and borderStrengthToken. Never invent background, radius, or icon properties.',
  'Category chips may only carry background/text/border/active-state colors. Never invent shape or placement properties.',
  'Header may only carry title color, letter spacing, and font weight. Never rewrite the title text itself.',
  'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
  'If a clear complementary tweak exists for another scope of this same page (palette/header/categoryChips/search), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null.',
];
