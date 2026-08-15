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
    warningRows: [],
  }),
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

    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));

    expect(
      screen.getByRole('button', { name: 'AI 분석하기' })
    ).toBeInTheDocument();
    expect(screen.queryByText('📂 파일 선택')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('excel-upload-dropzone')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '시장조사' }));

    expect(
      screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).toBeInTheDocument();
  });

  it('wires the market research state into the natural language prompt', () => {
    render(<DataEditorSection />);

    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));
    fireEvent.click(screen.getByRole('tab', { name: '시장조사' }));

    const textarea = screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘');
    fireEvent.change(textarea, { target: { value: '사과 부사 5kg' } });

    const marketResearchButton = screen.getByRole('button', { name: '시장조사' });
    expect(marketResearchButton).toBeEnabled();
  });
});
