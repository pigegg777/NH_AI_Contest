import { describe, expect, it } from 'vitest';

import { buildSections } from '../model/storefront-config/sectionMatching';

describe('buildSections generatedCategoryImages', () => {
  it('carries the category config generatedCategoryImages map onto the section', () => {
    const sections = buildSections(
      [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            generatedCategoryImages: {
              복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', isAiGenerated: true, generatedAt: '2026-08-17T00:00:00.000Z' },
            },
          },
        },
      ],
      [{ product_category_name: 'Fertilizer Upload', product_name: 'Alpha', medium_category: '복합비료' }],
    );

    expect(sections[0].generatedCategoryImages).toEqual({
      복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', isAiGenerated: true, generatedAt: '2026-08-17T00:00:00.000Z' },
    });
  });

  it('defaults to an empty object when the category config has none', () => {
    const sections = buildSections(
      [{ productCategoryName: 'Fertilizer Upload', categoryConfig: { displayName: 'Fertilizer Upload' } }],
      [{ product_category_name: 'Fertilizer Upload', product_name: 'Alpha' }],
    );

    expect(sections[0].generatedCategoryImages).toEqual({});
  });
});
