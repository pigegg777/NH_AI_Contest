import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NongyakUsagePanel from './NongyakUsagePanel';

const mockUseNongyakUsageQuery = vi.fn();
vi.mock('../hooks/useNongyakUsageQuery', () => ({
  useNongyakUsageQuery: (...args) => mockUseNongyakUsageQuery(...args),
}));

afterEach(() => {
  cleanup();
  mockUseNongyakUsageQuery.mockReset();
});

const selectedItem = { product_code: '1', product_name: '부란카트' };

describe('NongyakUsagePanel', () => {
  it('shows a placeholder when no item is selected', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<NongyakUsagePanel tab="inventory" item={null} />);

    expect(
      screen.getByText('카드를 선택하면 이 자리에 작물별 사용법이 표시됩니다.'),
    ).toBeInTheDocument();
  });

  it('shows a loading message while the usage query is pending', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: true, isError: false });

    render(<NongyakUsagePanel tab="inventory" item={selectedItem} />);

    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no usage rows', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<NongyakUsagePanel tab="catalog" item={selectedItem} />);

    expect(screen.getByText('등록된 작물별 사용법 정보가 없습니다.')).toBeInTheDocument();
  });

  it('renders the selected product name and a usage row in the table', () => {
    mockUseNongyakUsageQuery.mockReturnValue({
      data: [
        {
          cropName: '사과',
          diseaseWeedName: '부란병',
          pestiUse: '경엽처리',
          dilutUnit: '1000배',
          useSuittime: '발생초기',
          useNum: '3회',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<NongyakUsagePanel tab="inventory" item={selectedItem} />);

    expect(screen.getByRole('heading', { name: '작물별 사용법' })).toBeInTheDocument();
    expect(screen.getByText('부란카트')).toBeInTheDocument();
    expect(screen.getByText('사과')).toBeInTheDocument();
    expect(screen.getByText('부란병')).toBeInTheDocument();
  });

  it('shows 표시기호/성분/용도 for the selected item', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(
      <NongyakUsagePanel
        tab="inventory"
        item={{
          ...selectedItem,
          indict_symbl: '아4',
          nutirent: '폴리옥신비 0.5%',
          product_category: '살균제',
        }}
      />,
    );

    expect(screen.getByText('아4')).toBeInTheDocument();
    expect(screen.getByText('폴리옥신비 0.5%')).toBeInTheDocument();
    expect(screen.getByText('살균제')).toBeInTheDocument();
  });

  it('links the selected pesticide to its existing detail search', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(
      <NongyakUsagePanel
        tab="catalog"
        item={{ ...selectedItem, product_name: '프레바톤 5%' }}
      />,
    );

    const link = screen.getByRole('link', { name: '농약상세정보 바로가기' });
    const url = new URL(link.getAttribute('href'));

    expect(url.hostname).toBe('psis.rda.go.kr');
    expect(url.searchParams.get('sAgBrandNm')).toBe('프레바톤');
    expect(link).toHaveAttribute('target', '_blank');
  });

  const twoCropRows = [
    {
      cropName: '사과',
      diseaseWeedName: '부란병',
      pestiUse: '경엽처리',
      dilutUnit: '1000배',
      useSuittime: '발생초기',
      useNum: '3회',
    },
    {
      cropName: '배',
      diseaseWeedName: '흑성병',
      pestiUse: '경엽처리',
      dilutUnit: '2000배',
      useSuittime: '발생초기',
      useNum: '3회',
    },
  ];

  it('filters usage rows by crop name as the user types', () => {
    mockUseNongyakUsageQuery.mockReturnValue({
      data: twoCropRows,
      isLoading: false,
      isError: false,
    });

    render(<NongyakUsagePanel tab="inventory" item={selectedItem} />);

    expect(screen.getByText('부란병')).toBeInTheDocument();
    expect(screen.getByText('흑성병')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '작물별 사용법 내 작물 검색' }), {
      target: { value: '사과' },
    });

    expect(screen.getByText('부란병')).toBeInTheDocument();
    expect(screen.queryByText('흑성병')).not.toBeInTheDocument();
  });

  it('shows a dedicated empty message when the crop search matches nothing', () => {
    mockUseNongyakUsageQuery.mockReturnValue({
      data: twoCropRows,
      isLoading: false,
      isError: false,
    });

    render(<NongyakUsagePanel tab="inventory" item={selectedItem} />);

    fireEvent.change(screen.getByRole('searchbox', { name: '작물별 사용법 내 작물 검색' }), {
      target: { value: '수박' },
    });

    expect(screen.getByText('검색한 작물에 대한 사용법이 없습니다.')).toBeInTheDocument();
  });

  it('resets the crop search when a different item is selected', () => {
    mockUseNongyakUsageQuery.mockReturnValue({
      data: twoCropRows,
      isLoading: false,
      isError: false,
    });

    const { rerender } = render(<NongyakUsagePanel tab="inventory" item={selectedItem} />);

    const input = screen.getByRole('searchbox', { name: '작물별 사용법 내 작물 검색' });
    fireEvent.change(input, { target: { value: '사과' } });
    expect(screen.queryByText('흑성병')).not.toBeInTheDocument();

    rerender(
      <NongyakUsagePanel tab="inventory" item={{ ...selectedItem, product_code: '2' }} />,
    );

    expect(screen.getByText('흑성병')).toBeInTheDocument();
  });
});
