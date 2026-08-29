import { describe, expect, it } from 'vitest';

import { buildPesticideInfoUrl } from '../model/view/pesticideInfoLinkModel';

describe('buildPesticideInfoUrl', () => {
  it.each([
    ['프레바톤 5%', '프레바톤'],
    ['프레바톤(수화제)', '프레바톤'],
    ['프레바톤10', '프레바톤'],
  ])('uses only the product name before a space, opening parenthesis, or number', (productName, expectedSearchName) => {
    const url = buildPesticideInfoUrl({
      product_name: productName,
      large_category: '농약',
    });

    expect(new URL(url).searchParams.get('sAgBrandNm')).toBe(expectedSearchName);
  });

  it('does not build a link when a delimiter leaves no searchable name', () => {
    expect(
      buildPesticideInfoUrl({ product_name: '10% 수화제', large_category: '농약' }),
    ).toBe('');
  });
});
