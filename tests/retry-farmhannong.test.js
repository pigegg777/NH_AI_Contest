const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildUpdatePayload,
  detailMatchesProduct,
  isTargetProduct,
} = require('../scripts/retry-farmhannong-lib');

test('isTargetProduct selects only Farm Hannong rows with missing URLs', () => {
  assert.equal(
    isTargetProduct({
      suppliers: ['팜한농'],
      img_url: null,
      product_url: 'https://example.com/product',
    }),
    true
  );

  assert.equal(
    isTargetProduct({
      suppliers: ['팜한농'],
      img_url: 'https://example.com/image.png',
      product_url: '   ',
    }),
    true
  );

  assert.equal(
    isTargetProduct({
      suppliers: ['팜한농'],
      img_url: 'https://example.com/image.png',
      product_url: 'https://example.com/product',
    }),
    false
  );

  assert.equal(
    isTargetProduct({
      suppliers: ['조비'],
      img_url: null,
      product_url: null,
    }),
    false
  );
});

test('detailMatchesProduct verifies the detail page still matches the product before update', () => {
  assert.equal(
    detailMatchesProduct({
      productName: '에코뮬라(ecomula)(광분해)',
      foundName: '에코뮬라',
      detailName: '에코뮬라 (ecomula) (광분해)',
      detailText: '친환경 분해 과학 에코뮬라 기술 적용',
    }),
    true
  );

  assert.equal(
    detailMatchesProduct({
      productName: '에코뮬라(ecomula)(광분해)',
      foundName: '에코뮬라',
      detailName: '롱스타K플러스',
      detailText: '질소 · 칼리 코팅, 생육 후기까지 양분 공급',
    }),
    false
  );
});

test('buildUpdatePayload fills only the missing fields', () => {
  assert.deepEqual(
    buildUpdatePayload(
      {
        img_url: 'https://existing.example/image.png',
        product_url: null,
      },
      {
        imgUrl: 'https://new.example/image.png',
        productUrl: 'https://new.example/product',
      }
    ),
    {
      product_url: 'https://new.example/product',
    }
  );

  assert.deepEqual(
    buildUpdatePayload(
      {
        img_url: '   ',
        product_url: 'https://existing.example/product',
      },
      {
        imgUrl: 'https://new.example/image.png',
        productUrl: 'https://new.example/product',
      }
    ),
    {
      img_url: 'https://new.example/image.png',
    }
  );
});
