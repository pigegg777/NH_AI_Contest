import { describe, expect, it, vi } from 'vitest';

import { readStoredCart, writeStoredCart } from '../model/cartStorageModel';

function createStorage(initial = {}) {
  const data = { ...initial };

  return {
    getItem: vi.fn((key) => (key in data ? data[key] : null)),
    setItem: vi.fn((key, value) => {
      data[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete data[key];
    }),
    data,
  };
}

const REFS = [{ product_code: 'P-1', product_name: '프레바톤', spec: '500ml' }];

describe('readStoredCart', () => {
  it('reads back what writeStoredCart wrote', () => {
    const storage = createStorage();
    writeStoredCart(storage, REFS);

    expect(readStoredCart(storage)).toEqual(REFS);
  });

  it('returns an empty cart when nothing was stored', () => {
    expect(readStoredCart(createStorage())).toEqual([]);
  });

  it('returns an empty cart for damaged JSON instead of throwing', () => {
    const storage = createStorage({ 'nh-storefront-cart': '{not json' });

    expect(readStoredCart(storage)).toEqual([]);
  });

  it('drops entries it cannot identify', () => {
    const storage = createStorage({
      'nh-storefront-cart': JSON.stringify([{ product_name: '가', spec: '1' }, { junk: true }]),
    });

    expect(readStoredCart(storage)).toEqual([{ product_name: '가', spec: '1' }]);
  });

  it('returns an empty cart when the stored value is not an array', () => {
    const storage = createStorage({ 'nh-storefront-cart': '{"a":1}' });

    expect(readStoredCart(storage)).toEqual([]);
  });

  it('survives a storage that throws on read', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied');
      },
    };

    expect(readStoredCart(storage)).toEqual([]);
  });

  it('returns an empty cart when there is no storage at all', () => {
    expect(readStoredCart(null)).toEqual([]);
  });
});

describe('writeStoredCart', () => {
  it('removes the key instead of storing an empty list', () => {
    const storage = createStorage({ 'nh-storefront-cart': JSON.stringify(REFS) });
    writeStoredCart(storage, []);

    expect(storage.removeItem).toHaveBeenCalledWith('nh-storefront-cart');
    expect(readStoredCart(storage)).toEqual([]);
  });

  it('does not throw when storage is full or blocked', () => {
    const storage = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: vi.fn(),
    };

    expect(() => writeStoredCart(storage, REFS)).not.toThrow();
  });

  it('does nothing when there is no storage', () => {
    expect(() => writeStoredCart(null, REFS)).not.toThrow();
  });
});
