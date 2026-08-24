/**
 * The card layouts offered directly in the composer, in display order. Ids must
 * exist in CARD_STRUCTURAL_PRESETS. The remaining presets (detail-first,
 * compact-list) stay reachable through an AI request but are kept out of the
 * toggle so it fits on one line.
 */
export const CARD_DESIGN_LAYOUT_OPTIONS = [
  { id: 'header-top', label: '1형' },
  { id: 'image-left', label: '2형' },
  { id: 'header-split', label: '3형' },
];
