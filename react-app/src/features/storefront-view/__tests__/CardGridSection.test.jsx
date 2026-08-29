import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CardGridSection from '../components/storefront-page/product-cards/CardGridSection';
import { DEFAULT_CARD_STYLE } from '../model/card-style/cardStyleModel';

const BASE_SECTION = {
  products: [
    { row_id: 'seed-1', product_name: '종자 상품', medium_category: '종자', tax_price: 10000 },
    { row_id: 'fert-1', product_name: '비료 상품', medium_category: '비료', tax_price: 20000 },
  ],
};

describe('CardGridSection conditionalStyles', () => {
  it('applies the matching rule only to cards whose data satisfies the condition', () => {
    const cardStyle = {
      ...DEFAULT_CARD_STYLE,
      conditionalStyles: [
        {
          conditionField: 'medium_category',
          conditionOperator: 'equals',
          conditionValue: '종자',
          shell: { backgroundColor: '#e6f7d9' },
          header: null,
          image: null,
          info: null,
          field: null,
        },
      ],
    };

    render(
      <CardGridSection
        section={BASE_SECTION}
        fields={['product_name', 'tax_price']}
        cardStyle={cardStyle}
        sectionId="test-section"
      />,
    );

    const seedCard = screen.getByText('종자 상품').closest('article');
    const fertCard = screen.getByText('비료 상품').closest('article');

    expect(seedCard.style.getPropertyValue('--card-bg')).toBe('#e6f7d9');
    expect(fertCard.style.getPropertyValue('--card-bg')).toBe('');
  });

  it('matches a contains condition case-insensitively', () => {
    const cardStyle = {
      ...DEFAULT_CARD_STYLE,
      conditionalStyles: [
        {
          conditionField: 'product_name',
          conditionOperator: 'contains',
          conditionValue: '종자',
          shell: { radius: 'xl' },
          header: null,
          image: null,
          info: null,
          field: null,
        },
      ],
    };

    render(
      <CardGridSection
        section={BASE_SECTION}
        fields={['product_name', 'tax_price']}
        cardStyle={cardStyle}
        sectionId="test-section-2"
      />,
    );

    const seedCard = screen.getByText('종자 상품').closest('article');
    expect(seedCard.style.borderRadius).toBe('24px');
  });

  it('does not apply any override when no rule matches', () => {
    const cardStyle = {
      ...DEFAULT_CARD_STYLE,
      conditionalStyles: [
        {
          conditionField: 'medium_category',
          conditionOperator: 'equals',
          conditionValue: '농약',
          shell: { backgroundColor: '#e6f7d9' },
          header: null,
          image: null,
          info: null,
          field: null,
        },
      ],
    };

    render(
      <CardGridSection
        section={BASE_SECTION}
        fields={['product_name', 'tax_price']}
        cardStyle={cardStyle}
        sectionId="test-section-3"
      />,
    );

    const seedCard = screen.getByText('종자 상품').closest('article');
    expect(seedCard.getAttribute('style')).toBeFalsy();
  });

  it('does not let a second matching rule clobber a field the first rule already set in the same section', () => {
    const cardStyle = {
      ...DEFAULT_CARD_STYLE,
      conditionalStyles: [
        {
          conditionField: 'medium_category',
          conditionOperator: 'equals',
          conditionValue: '종자',
          shell: { backgroundColor: '#e6f7d9' },
          header: null,
          image: null,
          info: null,
          field: null,
        },
        {
          conditionField: 'product_name',
          conditionOperator: 'contains',
          conditionValue: '종자',
          shell: { radius: 'xl' },
          header: null,
          image: null,
          info: null,
          field: null,
        },
      ],
    };

    render(
      <CardGridSection
        section={BASE_SECTION}
        fields={['product_name', 'tax_price']}
        cardStyle={cardStyle}
        sectionId="test-section-4"
      />,
    );

    const seedCard = screen.getByText('종자 상품').closest('article');
    expect(seedCard.style.getPropertyValue('--card-bg')).toBe('#e6f7d9');
    expect(seedCard.style.borderRadius).toBe('24px');
  });
});

describe('CardGridSection image rendering', () => {
  it('renders the product img_url when img_url is a selected visible field', () => {
    render(
      <CardGridSection
        section={{
          products: [
            { row_id: 'p2', product_name: '실제 이미지 상품', img_url: 'https://example.com/real.png' },
          ],
        }}
        fields={['product_name', 'img_url']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-real"
      />,
    );

    const image = screen.getByRole('img', { name: '실제 이미지 상품' });
    expect(image).toHaveAttribute('src', 'https://example.com/real.png');
  });

  it('renders no image section when the product has no img_url', () => {
    render(
      <CardGridSection
        section={{
          products: [{ row_id: 'p3', product_name: '무이미지 상품' }],
        }}
        fields={['product_name', 'img_url']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-none"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders no image section when img_url is not a selected visible field, even if present', () => {
    render(
      <CardGridSection
        section={{
          products: [
            { row_id: 'p4', product_name: '숨긴 이미지 상품', img_url: 'https://example.com/real.png' },
          ],
        }}
        fields={['product_name']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-hidden-field"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('CardGridSection pesticide usage safety', () => {
  it('does not render product_usage from a previously saved visible field', () => {
    render(
      <CardGridSection
        section={{
          products: [
            {
              row_id: 'pesticide-usage-1',
              product_name: '안전한 농약',
              product_usage: [{ cropName: '벼', diseaseWeedName: '도열병' }],
            },
          ],
        }}
        fields={['product_name', 'product_usage']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="pesticide-usage-safety"
      />,
    );

    expect(screen.queryByText('작물별 용도')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /보기/ })).not.toBeInTheDocument();
  });
});
