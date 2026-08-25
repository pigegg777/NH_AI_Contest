import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CardGridSection from '../components/storefront-page/product-cards/CardGridSection';

const SECTION = {
  products: [{ product_name: '알파 비료', tax_price: 1000 }],
};

function renderSection(description) {
  render(
    <CardGridSection
      sectionId="s1"
      section={SECTION}
      fields={['product_name', 'tax_price']}
      description={description}
    />,
  );
}

describe('category description', () => {
  it('renders above the card grid', () => {
    renderSection('봄철 밑거름 모음');

    const note = screen.getByTestId('storefront-category-description');
    const grid = screen.getByTestId('storefront-card-grid-section');

    expect(note.textContent).toBe('봄철 밑거름 모음');
    expect(grid.contains(note)).toBe(true);
    expect(
      note.compareDocumentPosition(screen.getByText('알파 비료')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders nothing when the category has no description', () => {
    renderSection('');

    expect(
      screen.queryByTestId('storefront-category-description'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when the prop is missing entirely', () => {
    render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
      />,
    );

    expect(
      screen.queryByTestId('storefront-category-description'),
    ).not.toBeInTheDocument();
  });
});

describe('section header content', () => {
  // The caller maps over its enabled blocks, so "none" arrives as an empty
  // array. An empty array is truthy, and the wrapper it used to render carried
  // a bottom margin that pushed every grid down.
  it('renders no wrapper when the caller has no blocks to show', () => {
    const { container } = render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
        sectionHeaderContent={[]}
      />,
    );

    const grid = screen.getByTestId('storefront-card-grid-section');

    expect(grid.firstElementChild).toBe(
      container.querySelector('[class*="grid"]'),
    );
  });

  it('renders the wrapper once there is a block to show', () => {
    render(
      <CardGridSection
        sectionId="s1"
        section={SECTION}
        fields={['product_name']}
        sectionHeaderContent={[<span key="a">안내 문구</span>]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
  });
});
