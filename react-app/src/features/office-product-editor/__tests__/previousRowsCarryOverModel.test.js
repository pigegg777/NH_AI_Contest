import { describe, expect, it } from 'vitest';

import { carryOverPreviousRows } from '../model/previous-data-carryover/previousRowsCarryOverModel';

function row(overrides) {
  return {
    product_code: 'P1',
    sale_price_type_code: '01',
    product_name: '상품',
    spec: '20kg',
    img_url: '',
    note: '',
    tax_price: null,
    zero_tax_price: null,
    exempt_tax_price: null,
    ...overrides,
  };
}

describe('carryOverPreviousRows', () => {
  it('carries img_url and note onto a row with the same product code', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' })],
      [row({ product_code: 'P1', img_url: 'https://img/p1.png', note: '보조 1500원' })],
    );

    expect(result.rows[0].img_url).toBe('https://img/p1.png');
    expect(result.rows[0].note).toBe('보조 1500원');
    expect(result.carriedImageCount).toBe(1);
    expect(result.carriedNoteCount).toBe(1);
  });

  it('never carries the three price columns', () => {
    const result = carryOverPreviousRows(
      [row({ tax_price: 2000, zero_tax_price: 1800, exempt_tax_price: 1700 })],
      [
        row({
          img_url: 'https://img/p1.png',
          tax_price: 999,
          zero_tax_price: 888,
          exempt_tax_price: 777,
        }),
      ],
    );

    expect(result.rows[0].tax_price).toBe(2000);
    expect(result.rows[0].zero_tax_price).toBe(1800);
    expect(result.rows[0].exempt_tax_price).toBe(1700);
  });

  it('leaves every other column on the new excel value', () => {
    const result = carryOverPreviousRows(
      [row({ product_name: '새 이름', spec: '25kg', medium_category: '새 중분류' })],
      [row({ product_name: '옛 이름', spec: '20kg', medium_category: '옛 중분류', note: '비고' })],
    );

    expect(result.rows[0].product_name).toBe('새 이름');
    expect(result.rows[0].spec).toBe('25kg');
    expect(result.rows[0].medium_category).toBe('새 중분류');
    expect(result.rows[0].note).toBe('비고');
  });

  it('prefers the row with the same sale price type over another of the same product code', () => {
    const result = carryOverPreviousRows(
      [
        row({ product_code: 'P1', sale_price_type_code: '01' }),
        row({ product_code: 'P1', sale_price_type_code: '02' }),
      ],
      [
        row({ product_code: 'P1', sale_price_type_code: '01', note: '과세 비고' }),
        row({ product_code: 'P1', sale_price_type_code: '02', note: '영세 비고' }),
      ],
    );

    expect(result.rows[0].note).toBe('과세 비고');
    expect(result.rows[1].note).toBe('영세 비고');
  });

  it('falls back to the product code when the sale price type no longer matches', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1', sale_price_type_code: '09' })],
      [row({ product_code: 'P1', sale_price_type_code: '01', note: '예전 비고' })],
    );

    expect(result.rows[0].note).toBe('예전 비고');
  });

  it('skips empty previous values when falling back across price types', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1', sale_price_type_code: '09' })],
      [
        row({ product_code: 'P1', sale_price_type_code: '01', note: '' }),
        row({ product_code: 'P1', sale_price_type_code: '02', note: '살아있는 비고' }),
      ],
    );

    expect(result.rows[0].note).toBe('살아있는 비고');
  });

  it('keeps a value the new excel already carries', () => {
    const result = carryOverPreviousRows(
      [row({ img_url: 'https://img/new.png', note: '새 비고' })],
      [row({ img_url: 'https://img/old.png', note: '옛 비고' })],
    );

    expect(result.rows[0].img_url).toBe('https://img/new.png');
    expect(result.rows[0].note).toBe('새 비고');
    expect(result.carriedImageCount).toBe(0);
    expect(result.carriedNoteCount).toBe(0);
  });

  it('leaves a product code that did not exist before untouched', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'NEW' })],
      [row({ product_code: 'P1', img_url: 'https://img/p1.png', note: '비고' })],
    );

    expect(result.rows[0].img_url).toBe('');
    expect(result.rows[0].note).toBe('');
    expect(result.carriedImageCount).toBe(0);
    expect(result.carriedNoteCount).toBe(0);
  });

  it('counts each carried field separately', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' }), row({ product_code: 'P2' })],
      [
        row({ product_code: 'P1', img_url: 'https://img/p1.png', note: '비고' }),
        row({ product_code: 'P2', img_url: 'https://img/p2.png' }),
      ],
    );

    expect(result.carriedImageCount).toBe(2);
    expect(result.carriedNoteCount).toBe(1);
  });

  it('returns the new rows unchanged when there is nothing to carry over', () => {
    const newRows = [row({ product_code: 'P1' })];

    expect(carryOverPreviousRows(newRows, [])).toEqual({
      rows: newRows,
      carriedImageCount: 0,
      carriedNoteCount: 0,
      carriedShadowCount: 0,
    });
    expect(carryOverPreviousRows(newRows, null)).toEqual({
      rows: newRows,
      carriedImageCount: 0,
      carriedNoteCount: 0,
      carriedShadowCount: 0,
    });
  });

  it('tolerates a missing or blank product code instead of matching it', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: '' }), row({ product_code: undefined })],
      [row({ product_code: '', note: '비고' })],
    );

    expect(result.rows[0].note).toBe('');
    expect(result.rows[1].note).toBe('');
    expect(result.carriedNoteCount).toBe(0);
  });

  it('carries the hide flag that was on before', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' })],
      [row({ product_code: 'P1', shadow: true })],
    );

    expect(result.rows[0].shadow).toBe(true);
    expect(result.carriedShadowCount).toBe(1);
  });

  it('leaves a row that was not hidden before alone', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' })],
      [row({ product_code: 'P1', shadow: false })],
    );

    expect(result.rows[0].shadow).toBeUndefined();
    expect(result.carriedShadowCount).toBe(0);
  });

  it('treats a previous row without a hide flag as not hidden', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' })],
      [row({ product_code: 'P1', shadow: null })],
    );

    expect(result.rows[0].shadow).toBeUndefined();
    expect(result.carriedShadowCount).toBe(0);
  });

  it('keeps a hide flag the new rows already decided', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1', shadow: false })],
      [row({ product_code: 'P1', shadow: true })],
    );

    expect(result.rows[0].shadow).toBe(false);
    expect(result.carriedShadowCount).toBe(0);
  });

  it('prefers the row with the same sale price type for the hide flag too', () => {
    const result = carryOverPreviousRows(
      [
        row({ product_code: 'P1', sale_price_type_code: '01' }),
        row({ product_code: 'P1', sale_price_type_code: '02' }),
      ],
      [
        row({ product_code: 'P1', sale_price_type_code: '01', shadow: false }),
        row({ product_code: 'P1', sale_price_type_code: '02', shadow: true }),
      ],
    );

    expect(result.rows[0].shadow).toBeUndefined();
    expect(result.rows[1].shadow).toBe(true);
    expect(result.carriedShadowCount).toBe(1);
  });

  it('falls back to the product code for the hide flag when the price type no longer matches', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1', sale_price_type_code: '09' })],
      [row({ product_code: 'P1', sale_price_type_code: '01', shadow: true })],
    );

    expect(result.rows[0].shadow).toBe(true);
    expect(result.carriedShadowCount).toBe(1);
  });

  it('carries the hide flag alongside the photo and the note', () => {
    const result = carryOverPreviousRows(
      [row({ product_code: 'P1' })],
      [
        row({
          product_code: 'P1',
          img_url: 'https://img/p1.png',
          note: '비고',
          shadow: true,
        }),
      ],
    );

    expect(result.rows[0]).toMatchObject({
      img_url: 'https://img/p1.png',
      note: '비고',
      shadow: true,
    });
    expect(result.carriedImageCount).toBe(1);
    expect(result.carriedNoteCount).toBe(1);
    expect(result.carriedShadowCount).toBe(1);
  });
});
