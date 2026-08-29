import { describe, expect, it } from 'vitest';

import {
  CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CARD_SPACING_OPTIONS,
  CARD_IMAGE_FIT_OPTIONS,
  CARD_CONDITION_OPERATOR_OPTIONS,
  DEFAULT_CARD_STYLE,
} from '../../storefront-view/model/card-style/cardStyleModel';
import {
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
} from '../../storefront-view/model/card-style/cardLayoutPlanModel';
import {
  DEFAULT_PAGE_STYLE,
  PAGE_STYLE_CHIP_RADIUS_TOKENS,
  PAGE_STYLE_CHIP_STYLE_MODE_TOKENS,
  PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS,
  PAGE_STYLE_SEARCH_SIZE_TOKENS,
} from '../../storefront-view/model/page-style/pageStyleModel';
import {
  buildAppliedDesignHeadline,
  buildCardDesignSummary,
  buildPageDesignSummary,
} from '../model/design-summary/designSummaryModel';

const flatten = (groups) => groups.flatMap((group) => group.items);
const labelsOf = (groups) => flatten(groups).map((item) => item.label);
const findItem = (groups, label) => flatten(groups).find((item) => item.label === label);

describe('buildPageDesignSummary', () => {
  it('shows colors as swatches, not as hex text the merchant has to decode', () => {
    const groups = buildPageDesignSummary({
      ...DEFAULT_PAGE_STYLE,
      palette: { backgroundHex: '#fdf6d8', accentHex: '#6cc24a' },
    });
    const accent = findItem(groups, '포인트 색');

    expect(accent.kind).toBe('color');
    expect(accent.swatchHex).toBe('#6cc24a');
  });

  it('translates tokens into words instead of echoing the raw value', () => {
    const groups = buildPageDesignSummary({
      ...DEFAULT_PAGE_STYLE,
      categoryChips: { ...DEFAULT_PAGE_STYLE.categoryChips, radiusToken: 'pill' },
      productCategoryChips: {
        ...DEFAULT_PAGE_STYLE.productCategoryChips,
        styleMode: 'tab',
      },
    });

    expect(findItem(groups, '세부 분류 모서리').value).toBe('완전 둥글게');
    expect(findItem(groups, '대분류 모양').value).toBe('밑줄 탭');
    // 원본 토큰이 그대로 새어나오면 안 된다
    expect(flatten(groups).map((item) => item.value)).not.toContain('pill');
    expect(flatten(groups).map((item) => item.value)).not.toContain('tab');
  });

  it('leaves out internal bookkeeping the merchant never set', () => {
    const labels = labelsOf(buildPageDesignSummary(DEFAULT_PAGE_STYLE));

    expect(labels).not.toContain('schemaVersion');
    expect(labels.join(' ')).not.toMatch(/schema|version/i);
  });

  it('survives a missing or malformed page style', () => {
    expect(() => buildPageDesignSummary(null)).not.toThrow();
    expect(buildPageDesignSummary(null).length).toBeGreaterThan(0);
    expect(() => buildPageDesignSummary({ palette: null })).not.toThrow();
  });

  it('never renders an untranslated token for any allowed value', () => {
    const untranslated = [];

    for (const token of PAGE_STYLE_CHIP_RADIUS_TOKENS) {
      const groups = buildPageDesignSummary({
        ...DEFAULT_PAGE_STYLE,
        categoryChips: { ...DEFAULT_PAGE_STYLE.categoryChips, radiusToken: token },
      });
      if (findItem(groups, '세부 분류 모서리').value === token) untranslated.push(`radius:${token}`);
    }

    for (const token of PAGE_STYLE_CHIP_STYLE_MODE_TOKENS) {
      const groups = buildPageDesignSummary({
        ...DEFAULT_PAGE_STYLE,
        productCategoryChips: { ...DEFAULT_PAGE_STYLE.productCategoryChips, styleMode: token },
      });
      if (findItem(groups, '대분류 모양').value === token) untranslated.push(`styleMode:${token}`);
    }

    for (const token of PAGE_STYLE_SEARCH_SIZE_TOKENS) {
      const groups = buildPageDesignSummary({
        ...DEFAULT_PAGE_STYLE,
        search: { ...DEFAULT_PAGE_STYLE.search, sizeToken: token },
      });
      if (findItem(groups, '검색창 크기').value === token) untranslated.push(`search:${token}`);
    }

    for (const token of PAGE_STYLE_HEADER_TITLE_SIZE_TOKENS) {
      const groups = buildPageDesignSummary({
        ...DEFAULT_PAGE_STYLE,
        header: { ...DEFAULT_PAGE_STYLE.header, titleFontSizeToken: token },
      });
      if (findItem(groups, '제목 크기').value === token) untranslated.push(`title:${token}`);
    }

    expect(untranslated).toEqual([]);
  });
});

describe('buildCardDesignSummary', () => {
  it('says how many cards sit in a row in plain words', () => {
    const groups = buildCardDesignSummary({ ...DEFAULT_CARD_STYLE, cardsPerRow: 2 });

    expect(findItem(groups, '한 줄에').value).toBe('2개');
  });

  it('describes the layout as an order the merchant can read', () => {
    const groups = buildCardDesignSummary({
      ...DEFAULT_CARD_STYLE,
      layoutPlan: {
        ...DEFAULT_CARD_STYLE.layoutPlan,
        sectionOrder: ['header', 'image', 'info'],
        imagePlacement: 'top',
      },
    });

    expect(findItem(groups, '배치 순서').value).toBe('제목 → 이미지 → 정보');
    expect(findItem(groups, '이미지 위치').value).toBe('위쪽');
  });

  it('shows card colors as swatches', () => {
    const groups = buildCardDesignSummary({
      ...DEFAULT_CARD_STYLE,
      header: { ...DEFAULT_CARD_STYLE.header, backgroundColor: '#eef4ef' },
    });
    const item = findItem(groups, '제목 줄 배경');

    expect(item.kind).toBe('color');
    expect(item.swatchHex).toBe('#eef4ef');
  });

  it('falls back to the default design when a category has none saved', () => {
    expect(() => buildCardDesignSummary(undefined)).not.toThrow();
    expect(findItem(buildCardDesignSummary(undefined), '한 줄에').value).toBe('2개');
  });

  it('never renders an untranslated token for any allowed value', () => {
    const untranslated = [];
    const check = (label, patch, token) => {
      const groups = buildCardDesignSummary({ ...DEFAULT_CARD_STYLE, ...patch });
      if (findItem(groups, label).value === String(token)) untranslated.push(`${label}:${token}`);
    };

    for (const token of CARD_SHADOW_OPTIONS) {
      check('그림자', { shell: { ...DEFAULT_CARD_STYLE.shell, shadow: token } }, token);
    }
    for (const token of CARD_RADIUS_OPTIONS) {
      check('모서리', { shell: { ...DEFAULT_CARD_STYLE.shell, radius: token } }, token);
    }
    for (const token of CARD_SPACING_OPTIONS) {
      check('카드 간격', { shell: { ...DEFAULT_CARD_STYLE.shell, spacing: token } }, token);
    }
    for (const token of CARD_IMAGE_FIT_OPTIONS) {
      check('이미지 채움', { image: { ...DEFAULT_CARD_STYLE.image, fit: token } }, token);
    }
    for (const token of CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS) {
      check(
        '이미지 위치',
        { layoutPlan: { ...DEFAULT_CARD_STYLE.layoutPlan, imagePlacement: token } },
        token,
      );
    }
    expect(untranslated).toEqual([]);
  });
});

describe('buildAppliedDesignHeadline', () => {
  it('carries the colors as hexes for swatches and the facts as sentences', () => {
    const headline = buildAppliedDesignHeadline(
      { ...DEFAULT_PAGE_STYLE, palette: { backgroundHex: '#fdf6d8', accentHex: '#6cc24a' } },
      DEFAULT_CARD_STYLE,
    );

    expect(headline.swatches.map((swatch) => swatch.hex)).toContain('#6cc24a');
    expect(headline.facts).toContain('한 줄에 2개');
  });

  it('falls back to page facts when no category card design is on screen', () => {
    const headline = buildAppliedDesignHeadline(DEFAULT_PAGE_STYLE, null);

    expect(headline.facts.join(' ')).not.toMatch(/한 줄에/);
    expect(headline.facts.length).toBeGreaterThan(0);
  });
});

describe('buildCardDesignSummary 가 다루지 않는 값', () => {
  it('leaves out the layout knobs the merchant does not adjust', () => {
    const labels = buildCardDesignSummary(DEFAULT_CARD_STYLE)
      .flatMap((group) => group.items)
      .map((item) => item.label);

    expect(labels).not.toContain('강조하는 것');
    expect(labels).not.toContain('제목 줄 수');
    expect(labels).not.toContain('정보 밀도');
  });
});

describe('buildCardDesignSummary · 정보 묶음', () => {
  it('names the grouped fields the way they are printed on the card', () => {
    const groups = buildCardDesignSummary({
      ...DEFAULT_CARD_STYLE,
      info: {
        ...DEFAULT_CARD_STYLE.info,
        requestedGroups: [
          { id: 'g1', label: '규격 정보', display: 'inline-group', fields: ['spec', 'nutrient'] },
        ],
      },
    });

    const item = findItem(groups, '규격 정보');
    expect(item.value).toContain('규격 · 주요 성분');
    expect(item.value).toContain('한 줄에 나란히');
    // 저장된 컬럼 이름이 그대로 새어나오면 안 된다
    expect(item.value).not.toMatch(/spec|nutrient|inline-group/);
  });

  it('says so plainly when nothing is grouped', () => {
    expect(findItem(buildCardDesignSummary(DEFAULT_CARD_STYLE), '묶음').value).toBe('따로 묶지 않음');
  });

  it('still labels a group the merchant never named', () => {
    const groups = buildCardDesignSummary({
      ...DEFAULT_CARD_STYLE,
      info: {
        ...DEFAULT_CARD_STYLE.info,
        requestedGroups: [{ id: 'g1', label: '', display: 'stack-group', fields: ['spec'] }],
      },
    });

    expect(findItem(groups, '묶음 1').value).toContain('줄 바꿔 쌓기');
  });

  it('never renders an untranslated grouping token', () => {
    const untranslated = CARD_LAYOUT_GROUPING_HINT_OPTIONS.filter((token) => {
      const groups = buildCardDesignSummary({
        ...DEFAULT_CARD_STYLE,
        layoutPlan: { ...DEFAULT_CARD_STYLE.layoutPlan, groupingHint: token },
      });

      return findItem(groups, '묶는 방식').value === token;
    });

    expect(untranslated).toEqual([]);
  });
});

describe('buildCardDesignSummary · 조건에 따라 다르게', () => {
  const ruleFor = (conditionOperator) => ({
    ...DEFAULT_CARD_STYLE,
    conditionalStyles: [
      {
        conditionField: 'large_category',
        conditionOperator,
        conditionValue: '농약',
        shell: { borderColor: '#16a34a' },
      },
    ],
  });

  it('reads the condition as a sentence, not as field/operator/value', () => {
    const groups = buildCardDesignSummary(ruleFor('equals'));
    const labels = groups.flatMap((cardGroup) => cardGroup.items).map((item) => item.label);

    expect(labels).toContain("대분류가 '농약'일 때");
    expect(labels.join(' ')).not.toMatch(/large_category|equals/);
  });

  it('says what the rule changes rather than listing the new values', () => {
    const groups = buildCardDesignSummary(ruleFor('contains'));

    expect(findItem(groups, "대분류에 '농약' 포함").value).toBe('테두리 다르게');
  });

  it('says so plainly when no rule is set', () => {
    expect(findItem(buildCardDesignSummary(DEFAULT_CARD_STYLE), '조건부 디자인').value).toBe('없음');
  });

  it('handles every allowed operator without leaking the token', () => {
    for (const operator of CARD_CONDITION_OPERATOR_OPTIONS) {
      const groups = buildCardDesignSummary(ruleFor(operator));
      const labels = groups.flatMap((cardGroup) => cardGroup.items).map((item) => item.label);

      expect(labels.join(' ')).not.toContain(operator);
    }
  });
});

describe('조건 문장의 한글 조사', () => {
  const ruleFor = (conditionField) => ({
    ...DEFAULT_CARD_STYLE,
    conditionalStyles: [
      {
        conditionField,
        conditionOperator: 'equals',
        conditionValue: '요소',
        shell: { borderColor: '#16a34a' },
      },
    ],
  });
  const labelsOfCard = (style) =>
    buildCardDesignSummary(style)
      .flatMap((cardGroup) => cardGroup.items)
      .map((item) => item.label);

  it('picks 가 after a vowel ending and 이 after a consonant ending', () => {
    // 대분류(류, 받침 없음) vs 상품명(명, 받침 ㅇ)
    expect(labelsOfCard(ruleFor('large_category'))).toContain("대분류가 '요소'일 때");
    expect(labelsOfCard(ruleFor('product_name'))).toContain("상품명이 '요소'일 때");
  });

  it('does not put a particle on the value, whatever the value ends with', () => {
    const label = buildCardDesignSummary({
      ...DEFAULT_CARD_STYLE,
      conditionalStyles: [
        {
          conditionField: 'sale_price_type_name',
          conditionOperator: 'contains',
          conditionValue: '면세',
          field: { priceColorRole: 'blue' },
        },
      ],
    })
      .flatMap((cardGroup) => cardGroup.items)
      .map((item) => item.label)
      .find((text) => text.includes('면세'));

    expect(label).toBe("가격 유형에 '면세' 포함");
  });
});
