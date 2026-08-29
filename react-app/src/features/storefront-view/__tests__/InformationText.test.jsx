import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InformationText from '../components/storefront-page/category-nav/InformationText';

describe('InformationText', () => {
  it('renders plain text without wrapping it in an emphasis element', () => {
    const { container } = render(<InformationText text="영세가격 안내입니다" />);

    expect(container.textContent).toBe('영세가격 안내입니다');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('wraps a heading marker in its own element', () => {
    render(<InformationText text="<<봄철 밑거름>>" />);

    const heading = screen.getByTestId('information-text-heading');

    expect(heading.textContent).toBe('봄철 밑거름');
    expect(heading.tagName).toBe('STRONG');
  });

  it('wraps an important marker in its own element', () => {
    render(<InformationText text="[[영세가격]]" />);

    const important = screen.getByTestId('information-text-important');

    expect(important.textContent).toBe('영세가격');
    expect(important.tagName).toBe('STRONG');
  });

  it('keeps the surrounding text outside the emphasis element', () => {
    const { container } = render(
      <InformationText text="가격은 [[영세가격]]만 해당합니다" />,
    );

    expect(container.textContent).toBe('가격은 영세가격만 해당합니다');
    expect(screen.getByTestId('information-text-important').textContent).toBe(
      '영세가격',
    );
  });

  it('never interprets the merchant text as markup', () => {
    const { container } = render(
      <InformationText text="<script>alert(1)</script>" />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toBe('<script>alert(1)</script>');
  });

  it('renders nothing for empty text', () => {
    const { container } = render(<InformationText text="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
