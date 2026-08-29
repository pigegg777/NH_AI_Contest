import { describe, expect, it } from 'vitest';

import {
  buildStorefrontSavePayload,
  normalizeCategoryConfig,
  normalizePageConfig,
} from '../model/config-schema/storefrontConfigModel';
import { buildSections } from '../model/config-schema/sectionMatching';

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

// 옛 단일 문자열(nav.subtitle, categoryConfig.description)은 항목 목록이 생기기
// 전에 저장된 설정을 위한 읽기 폴백이다. 새 편집기가 목록을 한 번 쓰면 그 문자열은
// 할 일이 끝나므로 같은 저장에서 비워야 한다. 남겨두면 항목을 전부 지운 판매자에게
// 폴백이 방금 지운 문구를 그대로 되살려 준다.
describe('retiring the legacy text once the entry editor owns the list', () => {
  const LEGACY_OFFICE_TEXT = '영세가격 : 농업경영체 등록자';
  const LEGACY_CATEGORY_TEXT = '봄철 밑거름 안내';

  function buildExistingConfig() {
    return {
      officeCode: 'OFF-1',
      navConfig: { title: '농자재 안내', subtitle: LEGACY_OFFICE_TEXT },
      pageConfig: {
        nav: { title: '농자재 안내', subtitle: LEGACY_OFFICE_TEXT },
        officeInfo: [{ id: 'o1', label: '', description: LEGACY_OFFICE_TEXT }],
      },
      categoryConfigs: [
        {
          productCategoryName: '비료',
          categoryConfig: {
            displayName: '비료',
            sourceCategoryName: '비료',
            description: LEGACY_CATEGORY_TEXT,
            info: [{ id: 'c1', label: '', description: LEGACY_CATEGORY_TEXT }],
          },
        },
      ],
    };
  }

  function save(overrides) {
    return buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: buildExistingConfig(),
      hiddenProducts: [],
      selectedProductCategoryName: '비료',
      selectedMediumCategories: [],
      representativeMediumCategory: '',
      cardFields: ['product_name'],
      // 빌더의 draftNavConfig 는 저장된 subtitle 을 그대로 실어 보낸다.
      navConfig: { title: '농자재 안내', subtitle: LEGACY_OFFICE_TEXT },
      allowedScalarKeys: ['product_name'],
      ...overrides,
    });
  }

  function findCategoryRow(payload) {
    return payload.categoryConfigs.find(
      (row) => row.productCategoryName === '비료',
    ).categoryConfig;
  }

  it('keeps an explicitly emptied office list empty through save and rehydrate', () => {
    const payload = save({ officeInfoEntries: [], categoryInfoEntries: [] });

    expect(payload.pageConfig.officeInfo).toEqual([]);
    expect(payload.pageConfig.nav.subtitle).toBe('');
    expect(payload.navConfig.subtitle).toBe('');

    // 저장 직후 빌더는 이 payload 를 syncBuilderFromConfig 로 다시 읽는다.
    expect(normalizePageConfig(payload.pageConfig).officeInfo).toEqual([]);
  });

  it('keeps an explicitly emptied category list empty through save and rehydrate', () => {
    const payload = save({ officeInfoEntries: [], categoryInfoEntries: [] });
    const categoryConfig = findCategoryRow(payload);

    expect(categoryConfig.info).toEqual([]);
    expect(categoryConfig.description).toBe('');

    expect(normalizeCategoryConfig(categoryConfig, '비료').info).toEqual([]);
  });

  it('retires the legacy text even when the editor writes a non-empty list', () => {
    const payload = save({
      officeInfoEntries: [{ id: 'o2', label: '영세가격', description: '등록자' }],
      categoryInfoEntries: [{ id: 'c2', label: '봄철', description: '3월' }],
    });

    expect(payload.pageConfig.nav.subtitle).toBe('');
    expect(findCategoryRow(payload).description).toBe('');
  });

  it('still falls a legacy-only config back to one entry when no list is supplied', () => {
    const payload = save({});

    expect(payload.pageConfig.officeInfo).toEqual([
      { id: expect.any(String), label: '', description: LEGACY_OFFICE_TEXT },
    ]);
    expect(findCategoryRow(payload).info).toEqual([
      { id: expect.any(String), label: '', description: LEGACY_CATEGORY_TEXT },
    ]);

    // 새 편집기가 이 설정을 건드린 적이 없으니 폴백은 살아 있어야 한다.
    expect(payload.pageConfig.nav.subtitle).toBe(LEGACY_OFFICE_TEXT);
    expect(findCategoryRow(payload).description).toBe(LEGACY_CATEGORY_TEXT);
  });
});
