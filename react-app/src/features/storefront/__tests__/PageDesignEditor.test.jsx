import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PageDesignEditor from '../components/page-design/PageDesignEditor';
import { DEFAULT_PAGE_AI_DESIGN } from '../model/pageAiDesignModel';

describe('PageDesignEditor', () => {
  it('renders one page-style prompt field, lets the user choose a target scope, and calls onApply', async () => {
    const onChangePrompt = vi.fn();
    const onChangeTargetScope = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
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
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying={false}
        errorMessage=""
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('page-design-scope-header')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('page-design-scope-search')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('disables the apply button while applying and shows the error message', () => {
    render(
      <PageDesignEditor
        pageAiDesign={DEFAULT_PAGE_AI_DESIGN}
        onChangePrompt={vi.fn()}
        onChangeTargetScope={vi.fn()}
        onApply={vi.fn()}
        isApplying
        errorMessage="?섏씠吏 ?ㅽ??쇱쓣 ?곸슜?섏? 紐삵뻽?듬땲??"
        representativeCategoryLabel=""
      />,
    );

    expect(screen.getByTestId('apply-page-ai-design')).toBeDisabled();
    expect(
      screen.getByText('?섏씠吏 ?ㅽ??쇱쓣 ?곸슜?섏? 紐삵뻽?듬땲??'),
    ).toBeInTheDocument();
  });
});
