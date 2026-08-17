import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CategoryImageGenPanel from '../components/chat-workspace/CategoryImageGenPanel';

describe('CategoryImageGenPanel', () => {
  it('renders one row per medium category with a generate button', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료', '유기질비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{}}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '복합비료 이미지 생성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '유기질비료 이미지 생성' })).toBeInTheDocument();
  });

  it('calls onGenerate with the medium category and the typed override prompt', async () => {
    const onGenerate = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{}}
        onGenerate={onGenerate}
      />,
    );

    await user.type(screen.getByLabelText('복합비료 이미지 요청'), '파란 톤으로');
    await user.click(screen.getByRole('button', { name: '복합비료 이미지 생성' }));

    expect(onGenerate).toHaveBeenCalledWith('복합비료', { promptOverride: '파란 톤으로' });
  });

  it('disables the button and shows a generating label while in flight', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{ 복합비료: true }}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  it('disables only the generating category\'s button, leaving other categories independently enabled', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료', '유기질비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{ 복합비료: true }}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '유기질비료 이미지 생성' })).toBeEnabled();
  });

  it('shows a thumbnail preview once a generated image exists for the category', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{ 복합비료: { imageDataUri: 'data:image/png;base64,abc', isAiGenerated: true } }}
        isGeneratingCategoryImage={{}}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: '복합비료 생성 이미지 미리보기' })).toHaveAttribute(
      'src',
      'data:image/png;base64,abc',
    );
  });
});
