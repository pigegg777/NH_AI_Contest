import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AiBulkNoteWriterPanel } from '../components/data-edit-controls/workbook-ai-recommendation/ai-bulk-note/AiBulkNoteWriterPanel';
import { buildAiBulkNoteRowPlan } from '../model/ai-bulk-note/aiBulkNoteRowPlanModel';

// The panel only renders a prebuilt plan, so the supabase-backed lookup the
// row plan model can call is kept out of this suite.
vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: vi.fn(),
}));

const newRowTemplate = {
  product_name: '새 상품',
  spec: '20kg',
  large_category: null,
  medium_category: null,
  small_category: null,
  detail_category: null,
  sale_price_type_code: '01',
  sale_price_type_name: '과세',
  note: '보조 1500원',
  zero_tax_price: null,
  tax_price: 12000,
  exempt_tax_price: null,
};

const singleTargetRow = {
  row_id: 'A100__01',
  product_code: 'A100',
  product_name: '기존 비료',
  sale_price_type_code: '01',
  sale_price_type_name: '과세',
  note: '기존 비고',
  tax_price: 9000,
};

function renderPanel(overrides = {}) {
  const bulkNoteWriter = {
    rows: [],
    isLoading: false,
    mode: 'openai',
    action: 'append_rows',
    matches: [],
    rowPlan: buildAiBulkNoteRowPlan([], []),
    rowPlanCount: 0,
    ambiguousSelection: new Set(),
    selectedAmbiguousCount: 0,
    unmatchedReason: null,
    message: '',
    appliedSummary: '',
    referenceSheet: null,
    referenceSheetError: null,
    handlePreview: vi.fn(),
    handleApply: vi.fn(),
    handleApplyRowPlan: vi.fn(),
    handleToggleAmbiguousTarget: vi.fn(),
    handleClear: vi.fn(),
    handleUploadReferenceSheet: vi.fn(),
    handleRemoveReferenceSheet: vi.fn(),
    ...overrides,
  };

  render(<AiBulkNoteWriterPanel bulkNoteWriter={bulkNoteWriter} />);

  return bulkNoteWriter;
}

function buildPlanProps(newRows, existingRows) {
  const rowPlan = buildAiBulkNoteRowPlan(newRows, existingRows);

  return {
    rowPlan,
    rowPlanCount:
      rowPlan.appended.length + rowPlan.conflicting.length + rowPlan.ambiguous.length,
  };
}

describe('AiBulkNoteWriterPanel — 상품 추가 미리보기', () => {
  it('groups the plan into 신규 and 겹침 with a count for each', () => {
    renderPanel(
      buildPlanProps(
        [
          { ...newRowTemplate, product_code: 'Z999' },
          { ...newRowTemplate, product_code: 'A100' },
        ],
        [singleTargetRow],
      ),
    );

    expect(screen.getByText('신규 1건')).toBeInTheDocument();
    expect(screen.getByText(/겹침 1건/)).toBeInTheDocument();
    expect(screen.getByText(/상품 2건을 읽었습니다/)).toBeInTheDocument();
  });

  it('offers a 신규만 추가 button that excludes the conflicts', () => {
    const { handleApplyRowPlan } = renderPanel(
      buildPlanProps(
        [
          { ...newRowTemplate, product_code: 'Z999' },
          { ...newRowTemplate, product_code: 'A100' },
        ],
        [singleTargetRow],
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '신규 1건만 추가' }));

    expect(handleApplyRowPlan).toHaveBeenCalledWith({ includeConflicts: false });
  });

  it('offers a second button that also applies the conflicting updates', () => {
    const { handleApplyRowPlan } = renderPanel(
      buildPlanProps(
        [
          { ...newRowTemplate, product_code: 'Z999' },
          { ...newRowTemplate, product_code: 'A100' },
        ],
        [singleTargetRow],
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '신규 1건 추가 + 1건 갱신' }));

    expect(handleApplyRowPlan).toHaveBeenCalledWith({ includeConflicts: true });
  });

  it('shows the existing value next to the incoming one for a conflict', () => {
    renderPanel(
      buildPlanProps([{ ...newRowTemplate, product_code: 'A100' }], [singleTargetRow]),
    );

    expect(screen.getByText('기존 비고')).toBeInTheDocument();
    expect(screen.getByText('보조 1500원')).toBeInTheDocument();
    // Once as the entry heading, once as the struck-through old 상품명.
    expect(screen.getAllByText('기존 비료')).toHaveLength(2);
    expect(screen.getByText('새 상품')).toBeInTheDocument();
  });

  it('renders a checkbox per target row when one product_code spans several rows', () => {
    const secondRow = { ...singleTargetRow, row_id: 'A100__02', sale_price_type_name: '영세' };
    const { handleToggleAmbiguousTarget } = renderPanel(
      buildPlanProps([{ ...newRowTemplate, product_code: 'A100' }], [singleTargetRow, secondRow]),
    );

    expect(screen.getByText('확인 필요 1건')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);

    fireEvent.click(checkboxes[1]);

    expect(handleToggleAmbiguousTarget).toHaveBeenCalledWith('A100', 'A100__02');
  });

  it('hides the update button until an ambiguous target is ticked', () => {
    const secondRow = { ...singleTargetRow, row_id: 'A100__02', sale_price_type_name: '영세' };
    renderPanel(
      buildPlanProps([{ ...newRowTemplate, product_code: 'A100' }], [singleTargetRow, secondRow]),
    );

    expect(screen.queryByRole('button', { name: /갱신/ })).not.toBeInTheDocument();
  });

  it('warns on a product code the static registry does not know', () => {
    const planProps = buildPlanProps([{ ...newRowTemplate, product_code: 'Z999' }], []);
    planProps.rowPlan = {
      ...planProps.rowPlan,
      appended: planProps.rowPlan.appended.map((entry) => ({ ...entry, hasStaticData: false })),
    };

    renderPanel(planProps);

    expect(screen.getByText('정적 데이터 없음')).toBeInTheDocument();
  });

  it('falls back to the edit preview when the AI chose to edit rows', () => {
    renderPanel({
      action: 'edit_rows',
      matches: [{ rowId: 'A100__01', note: '보조 1500원' }],
      rows: [singleTargetRow],
    });

    expect(screen.getByText(/1개 상품이 매칭되었습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '적용' })).toBeInTheDocument();
  });
});
