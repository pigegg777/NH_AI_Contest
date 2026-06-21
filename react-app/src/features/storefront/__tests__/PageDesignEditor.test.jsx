import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_AI_DESIGN } from '../model/pageAiDesignModel';
import PageDesignEditor from '../components/PageDesignEditor';

describe('PageDesignEditor', () => {
  it('renders the main prompt and three override fields, and calls onApply', async () => {
    const onChangeMainPrompt = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        onChangeMainPrompt={onChangeMainPrompt}
        onChangeHeaderOverridePrompt={vi.fn()}
        onChangeCategoryChipsOverridePrompt={vi.fn()}
        onChangeSearchOverridePrompt={vi.fn()}
        onApply={onApply}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel="Fertilizer Upload"
      />,
    );

    expect(screen.getByLabelText('전체 페이지 분위기')).toBeInTheDocument();
    expect(screen.getByLabelText('헤더 제목 스타일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('카테고리 칩 스타일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('검색창 스타일 (선택)')).toBeInTheDocument();

    await user.type(screen.getByLabelText('전체 페이지 분위기'), 'b');
    expect(onChangeMainPrompt).toHaveBeenCalledWith('b');

    await user.click(screen.getByTestId('apply-page-ai-design'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('disables the apply button while applying and shows the error message', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        onChangeMainPrompt={vi.fn()}
        onChangeHeaderOverridePrompt={vi.fn()}
        onChangeCategoryChipsOverridePrompt={vi.fn()}
        onChangeSearchOverridePrompt={vi.fn()}
        onApply={vi.fn()}
        isApplying
        errorMessage="페이지 스타일을 적용하지 못했습니다."
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('apply-page-ai-design')).toBeDisabled();
    expect(screen.getByText('페이지 스타일을 적용하지 못했습니다.')).toBeInTheDocument();
  });
});
