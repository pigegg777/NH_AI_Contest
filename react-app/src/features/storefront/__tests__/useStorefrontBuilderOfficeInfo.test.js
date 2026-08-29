import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import { fetchStorefrontConfig } from '../../storefront-config/model/storefrontConfigOrchestrator';
import { useStorefrontBuilder } from '../hooks/useStorefrontBuilder';

vi.mock(
  '../../office-product-editor/services/office-product-data/officeProductDataReadService',
  () => ({
    fetchOfficeProductDataEntries: vi.fn(),
  }),
);

vi.mock('../../storefront-config/model/storefrontConfigOrchestrator', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

const LEGACY_OFFICE_TEXT = '영세가격 : 농업경영체 등록자';

// 항목 목록이 생기기 전에 저장된 설정. officeInfo 는 없고 옛 nav.subtitle 만 있다.
function buildLegacyConfig(categoryConfigs = []) {
  return {
    officeCode: 'OFF-1',
    navConfig: { title: '농자재 안내', subtitle: LEGACY_OFFICE_TEXT },
    pageConfig: {
      nav: { title: '농자재 안내', subtitle: LEGACY_OFFICE_TEXT },
    },
    categoryConfigs,
    hiddenProducts: [],
  };
}

const PRODUCT_ENTRIES = [
  {
    id: 1,
    officeCode: 'OFF-1',
    officeName: '영농센터',
    categoryName: '비료',
    rowCount: 1,
    rows: [
      { product_category_name: '비료', product_name: '알파', tax_price: 1000 },
    ],
  },
];

function renderBuilder() {
  return renderHook(() =>
    useStorefrontBuilder({ officeCode: 'OFF-1', nhName: '발안농협' }),
  );
}

const LEGACY_FALLBACK_ENTRY = {
  id: expect.any(String),
  label: '',
  description: LEGACY_OFFICE_TEXT,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStorefrontBuilder office information', () => {
  it('keeps an emptied office list out of the preview when no category is selected', async () => {
    // 상품 데이터를 아직 올리지 않은 사무소. 스토어프론트를 처음 꾸미는 판매자가
    // 정확히 이 상태에서 공통 탭에 안내를 쓴다.
    fetchOfficeProductDataEntries.mockResolvedValue([]);
    fetchStorefrontConfig.mockResolvedValue(buildLegacyConfig());

    const { result } = renderBuilder();

    await waitFor(() => expect(result.current.status).toBe('ready'));

    // 분류가 없으니 미리보기는 손으로 짓는 브랜치를 탄다.
    expect(result.current.selectedProductCategoryName).toBe('');
    expect(result.current.dataMode.officeInfoEntries).toEqual([
      LEGACY_FALLBACK_ENTRY,
    ]);
    expect(result.current.previewConfig.pageConfig.officeInfo).toEqual([
      LEGACY_FALLBACK_ENTRY,
    ]);

    act(() => {
      result.current.dataMode.setOfficeInfoEntries([]);
    });

    expect(result.current.dataMode.officeInfoEntries).toEqual([]);
    expect(result.current.previewConfig.pageConfig.officeInfo).toEqual([]);
  });

  it('writes an emptied office list through the save payload the hook builds', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(
      buildLegacyConfig([
        {
          productCategoryName: '비료',
          categoryConfig: {
            displayName: '비료',
            sourceCategoryName: '비료',
            cardDesign: { visibleFields: ['product_name'] },
          },
        },
      ]),
    );

    const { result } = renderBuilder();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.selectedProductCategoryName).toBe('비료');
    expect(result.current.dataMode.officeInfoEntries).toEqual([
      LEGACY_FALLBACK_ENTRY,
    ]);

    act(() => {
      result.current.dataMode.setOfficeInfoEntries([]);
    });

    const payload = result.current.buildCurrentSavePayload();

    expect(payload.pageConfig.officeInfo).toEqual([]);
    expect(payload.pageConfig.nav.subtitle).toBe('');
    expect(payload.navConfig.subtitle).toBe('');
    expect(result.current.previewConfig.pageConfig.officeInfo).toEqual([]);
  });
});
