import { describe, expect, it } from 'vitest';

import {
  MAX_INFORMATION_ENTRIES,
  createInformationEntry,
  normalizeInformationEntries,
} from '../model/storefront-config/informationEntriesModel';

describe('normalizeInformationEntries', () => {
  it('keeps the label and description of each entry', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: '영세가격', description: '농업경영체 등록자 구매가격' },
      ]),
    ).toEqual([
      { id: 'a', label: '영세가격', description: '농업경영체 등록자 구매가격' },
    ]);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeInformationEntries(undefined)).toEqual([]);
    expect(normalizeInformationEntries(null)).toEqual([]);
    expect(normalizeInformationEntries('영세가격')).toEqual([]);
    expect(normalizeInformationEntries({ label: '영세가격' })).toEqual([]);
  });

  it('drops entries where both halves are empty', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: '', description: '' },
        { id: 'b', label: '  ', description: '  ' },
        { id: 'c', label: '배송', description: '' },
        { id: 'd', label: '', description: '당일 발송' },
      ]),
    ).toEqual([
      { id: 'c', label: '배송', description: '' },
      { id: 'd', label: '', description: '당일 발송' },
    ]);
  });

  it('keeps line breaks inside a description but trims the ends', () => {
    expect(
      normalizeInformationEntries([
        { id: 'a', label: ' 보관 ', description: '  첫째 줄\n둘째 줄  ' },
      ]),
    ).toEqual([{ id: 'a', label: '보관', description: '첫째 줄\n둘째 줄' }]);
  });

  it('gives an entry an id when it arrives without one', () => {
    const [entry] = normalizeInformationEntries([
      { label: '배송', description: '당일 발송' },
    ]);

    expect(entry.id).toBeTruthy();
    expect(typeof entry.id).toBe('string');
  });

  it('never repeats an id, even when the saved ones collide', () => {
    const entries = normalizeInformationEntries([
      { id: 'same', label: 'a', description: '' },
      { id: 'same', label: 'b', description: '' },
      { label: 'c', description: '' },
    ]);

    expect(new Set(entries.map((entry) => entry.id)).size).toBe(3);
  });

  it('caps the list', () => {
    const source = Array.from({ length: MAX_INFORMATION_ENTRIES + 5 }, (_, index) => ({
      id: `e${index}`,
      label: `라벨 ${index}`,
      description: '',
    }));

    expect(normalizeInformationEntries(source)).toHaveLength(
      MAX_INFORMATION_ENTRIES,
    );
  });

  it('falls back to the old single string when there are no entries', () => {
    expect(
      normalizeInformationEntries([], { legacyText: '영세가격 : 농업경영체 등록자 구매가격' }),
    ).toEqual([
      {
        id: expect.any(String),
        label: '',
        description: '영세가격 : 농업경영체 등록자 구매가격',
      },
    ]);
  });

  it('ignores the old string once real entries exist', () => {
    expect(
      normalizeInformationEntries([{ id: 'a', label: '배송', description: '' }], {
        legacyText: '영세가격 : 농업경영체 등록자 구매가격',
      }),
    ).toEqual([{ id: 'a', label: '배송', description: '' }]);
  });

  it('does not invent an entry when both the list and the old string are empty', () => {
    expect(normalizeInformationEntries([], { legacyText: '   ' })).toEqual([]);
    expect(normalizeInformationEntries(undefined, {})).toEqual([]);
  });
});

describe('createInformationEntry', () => {
  it('returns a blank entry with its own id', () => {
    const first = createInformationEntry();
    const second = createInformationEntry();

    expect(first).toEqual({ id: expect.any(String), label: '', description: '' });
    expect(first.id).not.toBe(second.id);
  });
});
