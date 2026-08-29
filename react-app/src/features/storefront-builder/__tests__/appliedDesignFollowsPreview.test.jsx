import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import { fetchStorefrontConfig } from '../../storefront-config/model/storefrontConfigOrchestrator';
import { useStorefrontBuilder } from '../hooks/useStorefrontBuilder';

vi.mock(
  '../../office-product-editor/services/office-product-data/officeProductDataReadService',
  () => ({ fetchOfficeProductDataEntries: vi.fn() }),
);

vi.mock('../../storefront-config/model/storefrontConfigOrchestrator', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

const PRODUCT_ENTRIES = [
  {
    id: 1,
    officeCode: 'OFF-1',
    officeName: '영농센터',
    categoryName: '비료',
    rowCount: 1,
    rows: [{ product_category_name: '비료', product_name: '알파', tax_price: 1000 }],
  },
  {
    id: 2,
    officeCode: 'OFF-1',
    officeName: '영농센터',
    categoryName: '농약',
    rowCount: 1,
    rows: [{ product_category_name: '농약', product_name: '베타', tax_price: 2000 }],
  },
];

// 두 분류가 서로 다른 카드 디자인으로 저장된 가게. 이래야 '따라가지 않는다'가 보인다.
const CONFIG = {
  officeCode: 'OFF-1',
  navConfig: { title: '농자재 안내', subtitle: '' },
  pageConfig: { nav: { title: '농자재 안내', subtitle: '' } },
  categoryConfigs: [
    {
      productCategoryName: '비료',
      categoryConfig: {
        cardDesign: { cardStyle: { cardsPerRow: 1, shell: { shadow: 'none' } }, visibleFields: [], bodySlots: [] },
      },
    },
    {
      productCategoryName: '농약',
      categoryConfig: {
        cardDesign: { cardStyle: { cardsPerRow: 2, shell: { shadow: 'strong' } }, visibleFields: [], bodySlots: [] },
      },
    },
  ],
  hiddenProducts: [],
};

const valueOf = (summary, label) =>
  summary.card.flatMap((group) => group.items).find((item) => item.label === label)?.value;

beforeEach(() => {
  vi.clearAllMocks();
  fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
  fetchStorefrontConfig.mockResolvedValue(CONFIG);
});

describe('적용된 디자인이 미리보기가 보여주는 분류를 따라간다', () => {
  it('switches the card summary when the preview moves to another category', async () => {
    const { result } = renderHook(() =>
      useStorefrontBuilder({ officeCode: 'OFF-1', nhName: '발안농협' }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));

    // 폰이 비료를 띄운 상태
    act(() => result.current.notePreviewedCategory('비료'));
    await waitFor(() =>
      expect(result.current.appliedDesignSummary.categoryName).toBe('비료'),
    );
    expect(valueOf(result.current.appliedDesignSummary, '한 줄에')).toBe('1개');
    expect(valueOf(result.current.appliedDesignSummary, '그림자')).toBe('없음');

    // 폰 안에서 농약 칩을 누른 것과 같다
    act(() => result.current.notePreviewedCategory('농약'));
    await waitFor(() =>
      expect(result.current.appliedDesignSummary.categoryName).toBe('농약'),
    );
    expect(valueOf(result.current.appliedDesignSummary, '한 줄에')).toBe('2개');
    expect(valueOf(result.current.appliedDesignSummary, '그림자')).toBe('뚜렷하게');
  });

  it('does not change what the builder is editing', async () => {
    const { result } = renderHook(() =>
      useStorefrontBuilder({ officeCode: 'OFF-1', nhName: '발안농협' }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const editedBefore = result.current.selectedProductCategoryName;

    act(() => result.current.notePreviewedCategory('농약'));
    await waitFor(() =>
      expect(result.current.appliedDesignSummary.categoryName).toBe('농약'),
    );

    // 둘러보기만 한 것이므로 편집 대상은 그대로여야 한다.
    expect(result.current.selectedProductCategoryName).toBe(editedBefore);
  });

  it('shows the unsaved edits when the preview is on the category being edited', async () => {
    const { result } = renderHook(() =>
      useStorefrontBuilder({ officeCode: 'OFF-1', nhName: '발안농협' }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const edited = result.current.selectedProductCategoryName;

    act(() => result.current.notePreviewedCategory(edited));
    // 저장본은 1개다. 저장하지 않은 수정이 요약에 비쳐야 한다.
    expect(valueOf(result.current.appliedDesignSummary, '한 줄에')).toBe('1개');

    act(() => result.current.switchMode('design'));
    // 공통 요소가 아니라 그 분류를 편집 대상으로 잡아야 카드 조작이 열린다.
    act(() => result.current.designMode.selectCategory(edited));
    await waitFor(() => expect(result.current.composerMode?.setCardsPerRow).toBeTypeOf('function'));
    act(() => result.current.composerMode.setCardsPerRow(2));

    await waitFor(() =>
      expect(valueOf(result.current.appliedDesignSummary, '한 줄에')).toBe('2개'),
    );
  });
});
