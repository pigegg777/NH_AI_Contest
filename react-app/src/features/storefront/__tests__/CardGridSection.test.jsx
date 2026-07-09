import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CardGridSection from '../components/CardGridSection';
import { DEFAULT_CARD_STYLE } from '../model/card-design/cardStyleModel';

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
