import { describe, expect, it } from 'vitest';

import {
  resolveActiveCategoryName,
  validateCustomCategoryCreation,
} from '../model/sidebar-catalog/sidebarCatalogCreateModel';
import { buildOfficeProductDataCatalogModel } from '../model/sidebar-catalog/sidebarCatalogBuildModel';

describe('buildOfficeProductDataCatalogModel', () => {
  it('builds default cards, extra registered cards, and the add card', () => {
    const model = buildOfficeProductDataCatalogModel([
      {
        id: 1,
        categoryName: '비료',
        rowCount: 12,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T00:00:00Z',
      },
      {
        id: 2,
        categoryName: '종자',
        rowCount: 4,
        sourceFileName: '',
        updatedAt: 'invalid-date',
      },
    ]);

    expect(model.registeredCount).toBe(2);
    expect(model.cards).toHaveLength(4);
    expect(model.cards[0]).toEqual(
      expect.objectContaining({
        categoryName: '비료',
        isAdd: false,
        isEmpty: false,
        selectionMode: 'fertilizer',
        statusLabel: '등록됨',
      }),
    );
    expect(model.cards[0].meta[0]).toBe('12개 행');
    expect(model.cards[1]).toEqual(
      expect.objectContaining({
        categoryName: '농약',
        isAdd: false,
        isEmpty: true,
        selectionMode: 'pesticide',
        statusLabel: '미등록',
        description: '아직 저장된 데이터가 없습니다.',
      }),
    );
    expect(model.cards[2]).toEqual(
      expect.objectContaining({
        categoryName: '종자',
        isAdd: false,
        isEmpty: false,
        selectionMode: null,
        statusLabel: '등록됨',
      }),
    );
    expect(model.cards[2].meta).toEqual([
      '4개 행',
      '원본 파일 정보 없음',
      '업데이트 정보 없음',
    ]);
    expect(model.cards[3]).toEqual(
      expect.objectContaining({
        categoryName: '+ 추가',
        isAdd: true,
        selectionMode: 'custom',
        statusLabel: '준비 중',
      }),
    );
  });

  it('inserts pending custom categories before the add card', () => {
    const model = buildOfficeProductDataCatalogModel(
      [
        {
          id: 1,
          categoryName: '비료',
          rowCount: 12,
          sourceFileName: 'fertilizer.xlsx',
          updatedAt: '2026-06-07T00:00:00Z',
        },
      ],
      ['자재'],
    );

    expect(model.cards).toHaveLength(4);
    expect(model.cards[2]).toEqual(
      expect.objectContaining({
        categoryName: '자재',
        isAdd: false,
        isEmpty: true,
        isPendingCustom: true,
        statusLabel: '미등록',
      }),
    );
    expect(model.cards[3].categoryName).toBe('+ 추가');
  });

  it('drops a pending category once it becomes a registered item', () => {
    const model = buildOfficeProductDataCatalogModel(
      [
        {
          id: 1,
          categoryName: '자재',
          rowCount: 3,
          sourceFileName: 'materials.xlsx',
          updatedAt: '2026-06-07T00:00:00Z',
        },
      ],
      ['자재'],
    );

    const categoryNames = model.cards.map((card) => card.categoryName);
    expect(categoryNames.filter((name) => name === '자재')).toHaveLength(1);
  });
});

describe('validateCustomCategoryCreation', () => {
  it('rejects the reserved default category names with a sidebar guidance message', () => {
    expect(validateCustomCategoryCreation('비료')).toEqual({
      normalizedCategoryName: '비료',
      isValid: false,
      reason: 'default-category',
      message: '기본 카테고리는 사이드바에서 선택하세요',
    });
    expect(validateCustomCategoryCreation('농약')).toEqual({
      normalizedCategoryName: '농약',
      isValid: false,
      reason: 'default-category',
      message: '기본 카테고리는 사이드바에서 선택하세요',
    });
  });

  it('rejects a name that already exists', () => {
    expect(validateCustomCategoryCreation('자재', ['자재', '종자'])).toEqual({
      normalizedCategoryName: '자재',
      isValid: false,
      reason: 'duplicate',
      message: '이미 있는 카테고리입니다. 사이드바에서 선택하세요',
    });
  });

  it('accepts a new, non-reserved, non-duplicate name', () => {
    expect(validateCustomCategoryCreation('자재', ['종자'])).toEqual({
      normalizedCategoryName: '자재',
      isValid: true,
      reason: 'valid',
      message: '',
    });
  });

  it('treats an empty name as invalid without showing a create error message', () => {
    expect(validateCustomCategoryCreation('   ', ['종자'])).toEqual({
      normalizedCategoryName: '',
      isValid: false,
      reason: 'empty',
      message: '',
    });
  });
});

describe('resolveActiveCategoryName', () => {
  it('returns the default category name for preset modes', () => {
    expect(resolveActiveCategoryName('fertilizer', '')).toBe('비료');
    expect(resolveActiveCategoryName('pesticide', '')).toBe('농약');
  });

  it('returns the trimmed custom category name for custom mode', () => {
    expect(resolveActiveCategoryName('custom', '  자재  ')).toBe('자재');
  });
});
