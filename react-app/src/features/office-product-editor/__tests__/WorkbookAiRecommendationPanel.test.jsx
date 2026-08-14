import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkbookAiRecommendationPanel } from '../components/data-edit-controls/WorkbookAiRecommendationPanel';

describe('WorkbookAiRecommendationPanel', () => {
  it('keeps the natural language prompt input independent from the analyze button', () => {
    const onAiAnalyze = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={onAiAnalyze}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(
      '예: 마진율이 낮은 상품 위주로 검토해줘'
    );
    fireEvent.change(textarea, { target: { value: '마진율 낮은 상품 검토해줘' } });
    expect(textarea).toHaveValue('마진율 낮은 상품 검토해줘');
    expect(onAiAnalyze).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'AI 분석하기' }));
    expect(onAiAnalyze).toHaveBeenCalledTimes(1);
  });

  it('renders recommendations in the right column when results exist', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[
          {
            id: 'rec-1',
            title: '가격 확인 필요',
            severity: 'high',
            reason: '동일 상품 가격 상이',
            relatedRowIds: ['A100'],
          },
        ]}
        aiIsLoading={false}
      />
    );

    expect(screen.getByText('가격 확인 필요')).toBeInTheDocument();
  });

  it('renders the natural language prompt as a distinct labeled section from the analyze button', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    const heading = screen.getByRole('heading', { name: '💬 자연어로 요청하기' });
    const textarea = screen.getByPlaceholderText(
      '예: 마진율이 낮은 상품 위주로 검토해줘'
    );

    expect(heading).toBeInTheDocument();
    expect(textarea).toHaveAccessibleName('💬 자연어로 요청하기');
  });

  it('renders the auto-analysis button inside its own labeled section, separate from the prompt', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    const autoAnalysisHeading = screen.getByRole('heading', { name: '⚙️ 자동 분석' });
    const promptHeading = screen.getByRole('heading', { name: '💬 자연어로 요청하기' });
    const analyzeButton = screen.getByRole('button', { name: 'AI 분석하기' });

    expect(autoAnalysisHeading).toBeInTheDocument();
    expect(promptHeading).toBeInTheDocument();
    expect(autoAnalysisHeading.compareDocumentPosition(analyzeButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(autoAnalysisHeading.compareDocumentPosition(promptHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
