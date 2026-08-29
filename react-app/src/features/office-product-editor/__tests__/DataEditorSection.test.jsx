import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../contexts/editorContexts', () => ({
  useExtractionCtx: () => ({
    handleWorkbookChange: vi.fn(),
    result: { warnings: [] },
  }),
  useActiveCategoryCtx: () => ({
    isRegisteredProductDataLoading: false,
    registeredProductDataErrorMessage: '',
  }),
  useTableCtx: () => ({
    rows: [{ row_id: 'A100__01', product_name: '사과 부사 5kg' }],
    warningRows: [
      {
        row_id: 'A100__01',
        product_code: 'A100',
        sale_price_type_code: '01',
        product_name: '사과 부사 5kg',
        warnings: ['판매단가를 확인해 주세요.'],
      },
    ],
  }),
  useUploadCtx: () => ({ carryOver: { isAvailable: false } }),
  useAiCtx: () => ({
    recommendations: [
      {
        id: 'rec-1',
        title: '가격 확인 필요',
        reason: '동일 상품 가격 상이',
        relatedRowIds: ['A100__01'],
      },
    ],
    isLoading: false,
    analysisMode: 'openai',
    analysisMessage: '',
    activeRecommendationId: null,
    handleAnalyze: vi.fn(),
    handleRecommendationSelect: vi.fn(),
    marketResearch: {
      activeQuery: '',
      isLoading: false,
      mode: 'idle',
      report: null,
      message: '',
      handleMarketResearch: vi.fn(),
    },
    bulkNoteWriter: {
      rows: [],
      isLoading: false,
      mode: 'idle',
      matches: [],
      appliedCount: 0,
      handlePreview: vi.fn(),
      handleApply: vi.fn(),
      handleClear: vi.fn(),
      handleUploadReferenceSheet: vi.fn(),
      handleRemoveReferenceSheet: vi.fn(),
    },
  }),
}));

import { DataEditorSection } from '../components/DataEditorSection';

describe('DataEditorSection', () => {
  it('shows the excel upload tab by default and switches to the AI tab on click', () => {
    render(<DataEditorSection />);

    expect(screen.getByText('📂 파일 선택')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AI 분석하기' })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('excel-upload-dropzone')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: '엑셀 양식 데이터 업로드' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: 'AI 데이터 추가·수정' }),
    ).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('엑셀 등록')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '데이터 경고' })).toHaveTextContent(
      '판매단가를 확인해 주세요.',
    );
    expect(screen.queryByText('📝 일괄 데이터 수정')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'AI 데이터 추가·수정' }));

    expect(screen.getByText('📝 일괄 데이터 수정')).toBeInTheDocument();
    expect(screen.queryByTestId('excel-upload-dropzone')).not.toBeInTheDocument();
    expect(screen.getByText('AI 기능')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '데이터 경고' })).toHaveTextContent(
      '판매단가를 확인해 주세요.',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'AI 작업실' }));

    expect(
      screen.getByRole('button', { name: 'AI 분석하기' })
    ).toBeInTheDocument();
    expect(screen.queryByText('📂 파일 선택')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('excel-upload-dropzone')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'AI 일괄 데이터수정' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'AI 시장조사' }));

    expect(
      screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).toBeInTheDocument();
  });

  it('wires the market research state into the natural language prompt', () => {
    render(<DataEditorSection />);

    fireEvent.click(screen.getByRole('tab', { name: 'AI 작업실' }));
    fireEvent.click(screen.getByRole('tab', { name: 'AI 시장조사' }));

    const textarea = screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘');
    fireEvent.change(textarea, { target: { value: '사과 부사 5kg' } });

    const marketResearchButton = screen.getByRole('button', { name: '시장조사' });
    expect(marketResearchButton).toBeEnabled();
  });
});
