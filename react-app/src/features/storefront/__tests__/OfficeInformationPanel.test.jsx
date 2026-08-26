import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficeInformationPanel from '../components/storefront-page/category-nav/OfficeInformationPanel';

describe('OfficeInformationPanel', () => {
  it('shows the office heading and entries', () => {
    render(
      <OfficeInformationPanel
        entries={[{ id: 'o1', label: '영세가격', description: '농업경영체 등록자 구매가격' }]}
      />,
    );

    expect(screen.getByRole('heading', { name: '사무소 안내' })).toBeInTheDocument();
    expect(screen.getByText('농업경영체 등록자 구매가격')).toBeInTheDocument();
  });

  it('renders an entry with no label as description only', () => {
    render(<OfficeInformationPanel entries={[{ id: 'o1', label: '', description: '안내 문구' }]} />);

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
    expect(screen.queryByTestId('storefront-office-information-label-o1')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no entries', () => {
    const { container } = render(<OfficeInformationPanel entries={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
