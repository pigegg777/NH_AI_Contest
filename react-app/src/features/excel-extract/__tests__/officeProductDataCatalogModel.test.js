import { describe, expect, it } from 'vitest';

import {
  buildOfficeProductDataCatalogModel,
  validateCustomCategoryName,
} from '../model/catalog/officeProductDataCatalogModel';

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
        variant: 'default',
        isEmpty: false,
        isSelectable: true,
        selectionMode: 'fertilizer',
        statusLabel: '등록됨',
      }),
    );
    expect(model.cards[0].meta[0]).toBe('12개 행');
    expect(model.cards[1]).toEqual(
      expect.objectContaining({
        categoryName: '농약',
        variant: 'default',
        isEmpty: true,
        isSelectable: true,
        selectionMode: 'pesticide',
        statusLabel: '미등록',
        description: '아직 저장된 데이터가 없습니다.',
      }),
    );
    expect(model.cards[2]).toEqual(
      expect.objectContaining({
        categoryName: '종자',
        variant: 'registered',
        isEmpty: false,
        isSelectable: true,
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
        variant: 'add',
        isSelectable: true,
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
        variant: 'registered',
        isEmpty: true,
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

describe('validateCustomCategoryName', () => {
  it('rejects the reserved default category names', () => {
    expect(validateCustomCategoryName('비료')).toBe(
      "'비료', '농약'은(는) 테이블 이름으로 사용할 수 없습니다.",
    );
    expect(validateCustomCategoryName('농약')).toBe(
      "'비료', '농약'은(는) 테이블 이름으로 사용할 수 없습니다.",
    );
  });

  it('rejects a name that already exists', () => {
    expect(validateCustomCategoryName('자재', ['자재', '종자'])).toBe(
      '이미 사용 중인 테이블 이름입니다.',
    );
  });

  it('accepts a new, non-reserved, non-duplicate name', () => {
    expect(validateCustomCategoryName('자재', ['종자'])).toBeNull();
  });
});

