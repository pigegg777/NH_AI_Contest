import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficeInformationPanel from '../components/storefront-page/category-nav/OfficeInformationPanel';

const OFFICE_ENTRIES = [
  { id: 'o1', label: '영세가격', description: '농업경영체 등록자 구매가격' },
];
const CATEGORY_GROUPS = [
  {
    categoryName: '비료',
    entries: [{ id: 'c1', label: '봄철 밑거름', description: '3월 중순부터' }],
  },
];

describe('OfficeInformationPanel', () => {
  it('shows the office entries above the category groups', () => {
    render(
      <OfficeInformationPanel
        officeEntries={OFFICE_ENTRIES}
        categoryGroups={CATEGORY_GROUPS}
      />,
    );

    const office = screen.getByText('영세가격');
    const category = screen.getByText('봄철 밑거름');

    expect(office.compareDocumentPosition(category)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('heads each group with its category name', () => {
    render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={CATEGORY_GROUPS} />,
    );

    const group = screen.getByTestId('storefront-office-information-group-비료');

    expect(within(group).getByText('비료')).toBeInTheDocument();
    expect(within(group).getByText('3월 중순부터')).toBeInTheDocument();
  });

  it('renders an entry with no label as description only', () => {
    render(
      <OfficeInformationPanel
        officeEntries={[{ id: 'o1', label: '', description: '안내 문구' }]}
        categoryGroups={[]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
    expect(
      screen.queryByTestId('storefront-office-information-label-o1'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing at all when there is nothing to say', () => {
    const { container } = render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('omits the office block when only categories have entries', () => {
    render(
      <OfficeInformationPanel officeEntries={[]} categoryGroups={CATEGORY_GROUPS} />,
    );

    expect(
      screen.queryByTestId('storefront-office-information-office'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('storefront-office-information-group-비료'),
    ).toBeInTheDocument();
  });
});
