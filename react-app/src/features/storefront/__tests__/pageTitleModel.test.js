import { describe, expect, it } from 'vitest';

import { buildDerivedPageTitle } from '../model/storefront-view/pageTitleModel';

describe('buildDerivedPageTitle', () => {
  it('joins both names with the suffix when both are present', () => {
    expect(
      buildDerivedPageTitle({ nhName: '발안농협', officeName: '영농센터' }),
    ).toBe('발안농협 영농센터 농자재 정보');
  });

  it('uses just the nh name when only it is present', () => {
    expect(buildDerivedPageTitle({ nhName: '발안농협', officeName: '' })).toBe(
      '발안농협 농자재 정보',
    );
  });

  it('uses just the office name when only it is present', () => {
    expect(
      buildDerivedPageTitle({ nhName: '', officeName: '영농센터' }),
    ).toBe('영농센터 농자재 정보');
  });

  it('falls back to 상품 안내 when neither name is present', () => {
    expect(buildDerivedPageTitle({ nhName: '', officeName: '' })).toBe(
      '상품 안내',
    );
    expect(
      buildDerivedPageTitle({ nhName: undefined, officeName: undefined }),
    ).toBe('상품 안내');
  });

  it('treats whitespace-only names as absent', () => {
    expect(
      buildDerivedPageTitle({ nhName: '   ', officeName: '  \t ' }),
    ).toBe('상품 안내');
    expect(
      buildDerivedPageTitle({ nhName: '  발안농협  ', officeName: '   ' }),
    ).toBe('발안농협 농자재 정보');
  });
});
