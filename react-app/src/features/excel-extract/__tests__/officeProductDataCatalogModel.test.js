import { describe, expect, it } from 'vitest';

import { buildOfficeProductDataCatalogModel } from '../model/workbook-review/catalog/officeProductDataCatalogModel';

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
        statusLabel: '등록됨',
      }),
    );
    expect(model.cards[0].meta[0]).toBe('12개 행');
    expect(model.cards[1]).toEqual(
      expect.objectContaining({
        categoryName: '농약',
        variant: 'default',
        isEmpty: true,
        statusLabel: '미등록',
        description: '아직 저장된 데이터가 없습니다.',
      }),
    );
    expect(model.cards[2]).toEqual(
      expect.objectContaining({
        categoryName: '종자',
        variant: 'registered',
        isEmpty: false,
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
        statusLabel: '준비 중',
      }),
    );
  });
});
