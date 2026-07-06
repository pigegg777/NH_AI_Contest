import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PageDesignEditor from '../components/page-design/PageDesignEditor';
import { DEFAULT_PAGE_AI_DESIGN } from '../model/page-design/pageAiDesignModel';

describe('PageDesignEditor', () => {
  it('renders one page-style prompt field, lets the user choose a target scope, and calls onApply', async () => {
    const onChangePrompt = vi.fn();
    const onChangeTargetScope = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[]}
        onChangePrompt={onChangePrompt}
        onChangeTargetScope={onChangeTargetScope}
        onApply={onApply}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel="Fertilizer Upload"
      />,
    );

    const promptField = screen.getByRole('textbox');

    expect(screen.getByTestId('page-design-prompt-panel')).toBeInTheDocument();
    expect(screen.getByTestId('page-design-scope-list')).toBeInTheDocument();
    expect(promptField).toHaveAttribute('name', 'page-style-prompt');
    expect(promptField).toHaveAttribute('autocomplete', 'off');

    await user.type(promptField, 'b');
    expect(onChangePrompt).toHaveBeenCalledWith('b');

    await user.click(screen.getByTestId('page-design-scope-search'));
    expect(onChangeTargetScope).toHaveBeenCalledWith('search');

    await user.click(screen.getByTestId('apply-page-ai-design'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('marks the selected target scope as pressed', () => {
    render(
      <PageDesignEditor
        pageAiDesign={{ ...DEFAULT_PAGE_AI_DESIGN, targetScope: 'header' }}
        pageAiMessages={[]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('page-design-scope-header')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('page-design-scope-search')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables the apply button while applying and shows the error message', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying
        errorMessage="페이지 스타일을 적용하지 못했습니다."
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('apply-page-ai-design')).toBeDisabled();
    expect(screen.getByText('페이지 스타일을 적용하지 못했습니다.')).toBeInTheDocument();
  });

  it('renders the conversation thread with each message and its scope label', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        pageAiMessages={[
          { id: '1', role: 'user', text: '검색창을 크게 해줘', scope: 'search' },
          { id: '2', role: 'assistant', text: '검색창을 더 크게 바꿨습니다.', scope: 'search', suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.' },
        ]}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByText('검색창을 크게 해줘')).toBeInTheDocument();
    expect(screen.getByText('검색창을 더 크게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getByText('헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.')).toBeInTheDocument();
  });
});
