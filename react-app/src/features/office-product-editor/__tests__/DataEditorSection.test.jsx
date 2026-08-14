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
    rows: [{ row_id: 'A100__01' }],
    warningRows: [],
  }),
  useAiCtx: () => ({
    recommendations: [],
    isLoading: false,
    analysisMode: 'idle',
    analysisMessage: '',
    activeRecommendationId: null,
    handleAnalyze: vi.fn(),
    handleRecommendationSelect: vi.fn(),
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
    expect(
      screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).toBeInTheDocument();
  });
});
