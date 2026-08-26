import { describe, expect, it } from 'vitest';

import {
  buildStorefrontSavePayload,
  normalizeCategoryConfig,
  normalizePageConfig,
} from '../model/storefront-config/storefrontBuilderModel';
import { buildSections } from '../model/storefront-config/sectionMatching';

describe('page config information entries', () => {
  it('normalizes the saved entries', () => {
    expect(
      normalizePageConfig({
        officeInfo: [{ id: 'a', label: '영세가격', description: '농업경영체 등록자' }],
      }).officeInfo,
    ).toEqual([
      { id: 'a', label: '영세가격', description: '농업경영체 등록자' },
    ]);
  });

  it('falls back to the old nav subtitle', () => {
    expect(
      normalizePageConfig({ nav: { subtitle: '영세가격 : 농업경영체 등록자' } })
        .officeInfo,
    ).toEqual([
      { id: expect.any(String), label: '', description: '영세가격 : 농업경영체 등록자' },
    ]);
  });

  it('is empty when nothing was ever written', () => {
    expect(normalizePageConfig({}).officeInfo).toEqual([]);
  });
});

describe('category config information entries', () => {
  it('normalizes the saved entries', () => {
    expect(
      normalizeCategoryConfig(
        { info: [{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }] },
        '비료',
      ).info,
    ).toEqual([{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }]);
  });

  it('falls back to the old description string', () => {
    expect(
      normalizeCategoryConfig({ description: '봄철 밑거름 안내' }, '비료').info,
    ).toEqual([
      { id: expect.any(String), label: '', description: '봄철 밑거름 안내' },
    ]);
  });
});

describe('buildSections', () => {
  it('carries the entries onto the section', () => {
    const [section] = buildSections(
      [
        {
          productCategoryName: '비료',
          categoryConfig: {
            info: [{ id: 'a', label: '봄철 밑거름', description: '3월 중순부터' }],
          },
        },
      ],
      [{ product_category_name: '비료', product_name: '알파' }],
    );

    expect(section.infoEntries).toEqual([
      { id: 'a', label: '봄철 밑거름', description: '3월 중순부터' },
    ]);
  });

  it('gives an unconfigured category an empty list rather than undefined', () => {
    const [section] = buildSections(
      [],
      [{ product_category_name: '비료', product_name: '알파' }],
    );

    expect(section.infoEntries).toEqual([]);
  });
});

describe('buildStorefrontSavePayload', () => {
  it('writes both lists', () => {
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: '비료',
      selectedMediumCategories: [],
      representativeMediumCategory: '',
      cardFields: ['product_name'],
      officeInfoEntries: [{ id: 'o1', label: '영세가격', description: '등록자' }],
      categoryInfoEntries: [{ id: 'c1', label: '봄철', description: '3월' }],
      navConfig: {},
      mobileUiTree: undefined,
      allowedScalarKeys: ['product_name'],
    });

    expect(payload.pageConfig.officeInfo).toEqual([
      { id: 'o1', label: '영세가격', description: '등록자' },
    ]);
    expect(payload.categoryConfigs[0].categoryConfig.info).toEqual([
      { id: 'c1', label: '봄철', description: '3월' },
    ]);
  });
});
