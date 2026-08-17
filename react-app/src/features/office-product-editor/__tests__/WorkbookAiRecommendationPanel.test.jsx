import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkbookAiRecommendationPanel } from '../components/data-edit-controls/workbook-ai-recommendation/WorkbookAiRecommendationPanel';

function switchToMarketResearchTab() {
  fireEvent.click(screen.getByRole('tab', { name: '시장조사' }));
}

describe('WorkbookAiRecommendationPanel', () => {
  it('defaults to the 유사상품분석 sub-tab, showing the analyze button but not the market research prompt', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    expect(screen.getByRole('tab', { name: '유사상품분석' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('button', { name: 'AI 분석하기' })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).not.toBeInTheDocument();
  });

  it('switches to the 시장조사 sub-tab and shows its prompt input instead of the analyze button', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    switchToMarketResearchTab();

    expect(screen.getByRole('tab', { name: '시장조사' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AI 분석하기' })
    ).not.toBeInTheDocument();
  });

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

    switchToMarketResearchTab();

    const textarea = screen.getByPlaceholderText(
      '예: 마진율이 낮은 상품 위주로 검토해줘'
    );
    fireEvent.change(textarea, { target: { value: '마진율 낮은 상품 검토해줘' } });
    expect(textarea).toHaveValue('마진율 낮은 상품 검토해줘');
    expect(onAiAnalyze).not.toHaveBeenCalled();
  });

  it('passes the typed analysis hint to onAiAnalyze when the button is clicked', () => {
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

    const hintInput = screen.getByLabelText('AI 분석 참고사항');
    fireEvent.change(hintInput, {
      target: { value: '필름과 비닐은 같은 상품으로 봐주세요' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'AI 분석하기' }));

    expect(onAiAnalyze).toHaveBeenCalledWith('필름과 비닐은 같은 상품으로 봐주세요');
  });

  it('renders recommendations in the 유사상품분석 sub-tab when results exist', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[
          {
            id: 'rec-1',
            title: '가격 확인 필요',
            reason: '동일 상품 가격 상이',
            relatedRowIds: ['A100'],
          },
        ]}
        aiIsLoading={false}
      />
    );

    expect(screen.getByText('가격 확인 필요')).toBeInTheDocument();
  });

  it('submits the typed prompt for market research', () => {
    const handleMarketResearch = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: false,
          mode: 'idle',
          report: null,
          message: '',
          handleMarketResearch,
        }}
      />
    );

    switchToMarketResearchTab();

    const textarea = screen.getByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘');
    fireEvent.change(textarea, { target: { value: '사과 부사 5kg' } });
    fireEvent.click(screen.getByRole('button', { name: '시장조사' }));

    expect(handleMarketResearch).toHaveBeenCalledWith('사과 부사 5kg');
  });

  it('disables the market research submit button while the prompt is empty', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: false,
          mode: 'idle',
          report: null,
          message: '',
          handleMarketResearch: vi.fn(),
        }}
      />
    );

    switchToMarketResearchTab();

    expect(screen.getByRole('button', { name: '시장조사' })).toBeDisabled();
  });

  it('shows a loading message while the market research query is running', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: true,
          mode: 'idle',
          report: null,
          message: '',
          handleMarketResearch: vi.fn(),
        }}
      />
    );

    switchToMarketResearchTab();

    expect(screen.getByText('시장조사 중...')).toBeInTheDocument();
  });

  it('renders the market research report once it completes', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: false,
          mode: 'openai',
          report: {
            understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
            clarificationNeeded: null,
            dataFound: true,
            priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
            priceSources: [
              { url: 'https://www.coupang.com/x', site: '쿠팡', priceKrw: 13800, observedDate: '2026-08-14' },
            ],
            newsArticles: [
              {
                title: '사과 가격 상승세',
                summary: '이상기후로 사과 출하량이 줄며 가격이 올랐다.',
                url: 'https://news.example.com/apple-price',
                site: '예시뉴스',
                publishedDate: '2026-08-10',
              },
            ],
            searchQueries: ['site:search.shopping.naver.com/ns/search 사과 부사 5kg'],
          },
          message: '',
          handleMarketResearch: vi.fn(),
        }}
      />
    );

    switchToMarketResearchTab();

    expect(screen.getByText('사과 부사 5kg 온라인 판매가 조사')).toBeInTheDocument();
    expect(screen.getByText(/13,800원 ~ 29,900원/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '쿠팡' })).toHaveAttribute(
      'href',
      'https://www.coupang.com/x',
    );
    expect(screen.getByRole('link', { name: '사과 가격 상승세' })).toHaveAttribute(
      'href',
      'https://news.example.com/apple-price',
    );
    expect(screen.getByText('이상기후로 사과 출하량이 줄며 가격이 올랐다.')).toBeInTheDocument();
    expect(
      screen.getByText('site:search.shopping.naver.com/ns/search 사과 부사 5kg'),
    ).toBeInTheDocument();
  });

  it('renders the report as its own card, separate from the prompt input section', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: false,
          mode: 'openai',
          report: {
            understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
            clarificationNeeded: null,
            dataFound: true,
            priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
            priceSources: [],
            newsArticles: [],
            searchQueries: [],
          },
          message: '',
          handleMarketResearch: vi.fn(),
        }}
      />
    );

    switchToMarketResearchTab();

    const reportHeading = screen.getByRole('heading', { name: '🔎 시장조사' });
    const reportCard = reportHeading.closest('section');
    expect(within(reportCard).getByText('사과 부사 5kg 온라인 판매가 조사')).toBeInTheDocument();

    const promptHeading = screen.getByRole('heading', { name: '💬 요청사항 입력' });
    const promptSection = promptHeading.closest('section');
    expect(within(promptSection).queryByText('사과 부사 5kg 온라인 판매가 조사')).not.toBeInTheDocument();
  });

  it('shows a not-found message when the market research query finds no data', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        marketResearch={{
          isLoading: false,
          mode: 'openai',
          report: {
            understoodQuery: '은하수쿼카열매 3.5kg',
            clarificationNeeded: null,
            dataFound: false,
            priceRange: null,
            priceSources: [],
          },
          message: '',
          handleMarketResearch: vi.fn(),
        }}
      />
    );

    switchToMarketResearchTab();

    expect(screen.getByText('온라인 판매 정보를 찾지 못했습니다.')).toBeInTheDocument();
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

    switchToMarketResearchTab();

    const heading = screen.getByRole('heading', { name: '💬 요청사항 입력' });
    const textarea = screen.getByPlaceholderText(
      '예: 마진율이 낮은 상품 위주로 검토해줘'
    );

    expect(heading).toBeInTheDocument();
    expect(textarea).toHaveAccessibleName('💬 요청사항 입력');
    expect(screen.queryByRole('button', { name: 'AI 분석하기' })).not.toBeInTheDocument();
  });

  it('renders the auto-analysis button inside its own labeled section on the 유사상품분석 tab', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
      />
    );

    const autoAnalysisHeading = screen.getByRole('heading', { name: '⚙️ 요청사항 입력' });
    const analyzeButton = screen.getByRole('button', { name: 'AI 분석하기' });

    expect(autoAnalysisHeading).toBeInTheDocument();
    expect(analyzeButton).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('예: 마진율이 낮은 상품 위주로 검토해줘')
    ).not.toBeInTheDocument();
  });

  it('switches to the 일괄비고작성 sub-tab and shows its instruction textarea', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByRole('tab', { name: '일괄비고작성' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByPlaceholderText("예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘")
    ).toBeInTheDocument();
  });

  it('submits the typed instruction for bulk note preview', () => {
    const handlePreview = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview,
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    const textarea = screen.getByPlaceholderText(
      "예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘"
    );
    fireEvent.change(textarea, {
      target: { value: "소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘" },
    });
    fireEvent.click(screen.getByRole('button', { name: '매칭 미리보기' }));

    expect(handlePreview).toHaveBeenCalledWith("소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘");
  });

  it('renders the match preview and calls updateNote once per match on 적용', () => {
    const handleApply = vi.fn();
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [
            { row_id: 'A100__01', product_name: '유기질비료', spec: '20kg', note: '기존 비고' },
            { row_id: 'B200__01', product_name: '축분퇴비', spec: '10kg', note: '' },
          ],
          isLoading: false,
          mode: 'openai',
          matches: [
            { rowId: 'A100__01', note: '보조 1500원' },
            { rowId: 'B200__01', note: '보조 1500원' },
          ],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply,
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByText('2개 상품이 매칭되었습니다. 기존 비고를 새 내용으로 덮어씁니다.')).toBeInTheDocument();
    expect(screen.getByText('유기질비료')).toBeInTheDocument();
    expect(screen.getByText('축분퇴비')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(handleApply).toHaveBeenCalledTimes(1);
  });

  it('shows the unmatched reason when the AI finds no matching rows', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'openai',
          matches: [],
          unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByText('조건에 맞는 상품을 찾지 못했습니다.')).toBeInTheDocument();
  });

  it('uploads a reference sheet and can remove it again', () => {
    const handleUploadReferenceSheet = vi.fn();
    const handleRemoveReferenceSheet = vi.fn();
    const { rerender } = render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          referenceSheet: null,
          referenceSheetError: null,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
          handleUploadReferenceSheet,
          handleRemoveReferenceSheet,
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    const file = new File(['dummy'], 'ref.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(screen.getByLabelText('📎 참고 엑셀 업로드'), { target: { files: [file] } });

    expect(handleUploadReferenceSheet).toHaveBeenCalledWith(file);

    rerender(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          referenceSheet: { fileName: 'ref.xlsx', sheetName: 'Sheet1', rows: [['a'], ['b']] },
          referenceSheetError: null,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
          handleUploadReferenceSheet,
          handleRemoveReferenceSheet,
        }}
      />
    );

    expect(screen.getByText('📎 ref.xlsx · Sheet1 · 2행')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '제거' }));

    expect(handleRemoveReferenceSheet).toHaveBeenCalledTimes(1);
  });

  it('shows the reference sheet upload error message', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          referenceSheet: null,
          referenceSheetError: '참고 엑셀은 500행 이하만 지원합니다.',
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
          handleUploadReferenceSheet: vi.fn(),
          handleRemoveReferenceSheet: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByText('참고 엑셀은 500행 이하만 지원합니다.')).toBeInTheDocument();
  });

  it('disables the 매칭 미리보기 button while the instruction textarea is empty', () => {
    render(
      <WorkbookAiRecommendationPanel
        onAiAnalyze={vi.fn()}
        aiDisabled={false}
        hasRows={true}
        aiRecommendations={[]}
        aiIsLoading={false}
        bulkNoteWriter={{
          rows: [],
          isLoading: false,
          mode: 'idle',
          matches: [],
          unmatchedReason: null,
          message: '',
          appliedCount: 0,
          handlePreview: vi.fn(),
          handleApply: vi.fn(),
          handleClear: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '일괄비고작성' }));

    expect(screen.getByRole('button', { name: '매칭 미리보기' })).toBeDisabled();
  });
});
