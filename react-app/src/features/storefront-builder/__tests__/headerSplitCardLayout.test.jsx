import { render, screen } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CardGridSection from '../../storefront-view/components/storefront-page/product-cards/CardGridSection';
import { useCardAiDesign } from '../hooks/useCardAiDesign';
import { CARD_DESIGN_LAYOUT_OPTIONS } from '../model/card-design/ai-request/cardDesignLayoutOptions';
import {
  isHeaderAboveSplit,
  resolveStructuralPreset,
  resolveStructuralPresetFromLayoutPlan,
} from '../../storefront-view/model/card-design/style/cardCompositionModel';
import { deriveLegacyCardLayoutPlan } from '../../storefront-view/model/card-design/style/cardLayoutPlanModel';
import { normalizeCardStyle } from '../../storefront-view/model/card-design/style/cardStyleModel';

const SECTION = {
  products: [
    {
      row_id: 'fert-1',
      product_name: '유기질비료 20kg',
      img_url: 'https://example.test/fert.png',
      tax_price: 12000,
    },
  ],
};

function buildHeaderSplitCardStyle() {
  return normalizeCardStyle({
    cardsPerRow: 1,
    structuralPreset: 'header-split',
    titleMode: 'header',
    layoutPlan: deriveLegacyCardLayoutPlan({
      cardsPerRow: 1,
      structuralPreset: 'header-split',
      titleMode: 'header',
    }),
  });
}

describe('header-split layout plan', () => {
  it('puts the header ahead of a left-placed image', () => {
    const plan = deriveLegacyCardLayoutPlan({
      cardsPerRow: 1,
      structuralPreset: 'header-split',
      titleMode: 'header',
    });

    expect(plan.sectionOrder).toEqual(['header', 'image', 'info']);
    expect(plan.imagePlacement).toBe('left');
    expect(isHeaderAboveSplit(plan.sectionOrder)).toBe(true);
  });

  it('stays distinct from image-left when mapped back from a layout plan', () => {
    const headerSplitPlan = deriveLegacyCardLayoutPlan({
      cardsPerRow: 1,
      structuralPreset: 'header-split',
      titleMode: 'header',
    });
    const imageLeftPlan = deriveLegacyCardLayoutPlan({
      cardsPerRow: 1,
      structuralPreset: 'image-left',
      titleMode: 'header',
    });

    expect(resolveStructuralPresetFromLayoutPlan(headerSplitPlan, 1)).toBe(
      'header-split',
    );
    expect(resolveStructuralPresetFromLayoutPlan(imageLeftPlan, 1)).toBe(
      'image-left',
    );
  });

  it('is not eligible while two cards share a row', () => {
    expect(resolveStructuralPreset('header-split', 1)).toBe('header-split');
    expect(resolveStructuralPreset('header-split', 2)).toBe('header-top');
  });

  it('offers exactly the three layouts the composer toggle shows', () => {
    expect(CARD_DESIGN_LAYOUT_OPTIONS.map((option) => option.id)).toEqual([
      'header-top',
      'image-left',
      'header-split',
    ]);
  });
});

describe('header-split rendering', () => {
  it('renders the title above a row holding the image and the info area', () => {
    render(
      <CardGridSection
        section={SECTION}
        fields={['product_name', 'img_url', 'tax_price']}
        cardStyle={buildHeaderSplitCardStyle()}
        sectionId="header-split-section"
      />,
    );

    const card = screen.getByText('유기질비료 20kg').closest('article');
    const title = screen.getByText('유기질비료 20kg');
    const image = card.querySelector('img');

    // The title must be a direct child of the card, not nested beside the image.
    expect(title.closest('article')).toBe(card);
    expect(image).not.toBeNull();
    expect(title.contains(image)).toBe(false);

    // Image and info share one row that starts after the title.
    const splitRow = image.closest('div[class*="cardSplitRow"]');
    expect(splitRow).not.toBeNull();
    expect(splitRow.contains(title)).toBe(false);
    expect(
      title.compareDocumentPosition(splitRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps image-left rendering the title inside the column beside the image', () => {
    const cardStyle = normalizeCardStyle({
      cardsPerRow: 1,
      structuralPreset: 'image-left',
      titleMode: 'header',
      layoutPlan: deriveLegacyCardLayoutPlan({
        cardsPerRow: 1,
        structuralPreset: 'image-left',
        titleMode: 'header',
      }),
    });

    render(
      <CardGridSection
        section={SECTION}
        fields={['product_name', 'img_url', 'tax_price']}
        cardStyle={cardStyle}
        sectionId="image-left-section"
      />,
    );

    const card = screen.getByText('유기질비료 20kg').closest('article');

    expect(card.querySelector('div[class*="cardSplitRow"]')).toBeNull();
  });
});

describe('useCardAiDesign structural preset', () => {
  it('drops to one card per row so a side-by-side layout can actually apply', () => {
    const { result } = renderHook(() => useCardAiDesign({ officeCode: 'OFF-1' }));

    expect(result.current.cardStyle.cardsPerRow).toBe(2);

    act(() => result.current.setStructuralPreset('header-split'));

    expect(result.current.cardStyle.cardsPerRow).toBe(1);
    expect(result.current.cardStyle.structuralPreset).toBe('header-split');
  });

  it('forces header title mode so the name is not repeated in the info area', () => {
    const { result } = renderHook(() => useCardAiDesign({ officeCode: 'OFF-1' }));

    act(() => result.current.setCardsPerRow(1));
    act(() => result.current.setStructuralPreset('header-split'));

    expect(result.current.cardStyle.structuralPreset).toBe('header-split');
    expect(result.current.cardStyle.titleMode).toBe('header');
    expect(result.current.cardStyle.layoutPlan.imagePlacement).toBe('left');
    expect(result.current.cardStyle.layoutPlan.sectionOrder).toEqual([
      'header',
      'image',
      'info',
    ]);
  });

  it('rebuilds the layout plan when a card-count change makes the preset ineligible', () => {
    const { result } = renderHook(() => useCardAiDesign({ officeCode: 'OFF-1' }));

    act(() => result.current.setCardsPerRow(1));
    act(() => result.current.setStructuralPreset('header-split'));
    act(() => result.current.setCardsPerRow(2));

    expect(result.current.cardStyle.structuralPreset).toBe('header-top');
    // Without rebuilding the plan the card would keep rendering side by side
    // even though the preset no longer allows it.
    expect(result.current.cardStyle.layoutPlan.imagePlacement).toBe('top');
  });
});
