import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  PAGE_DESCRIPTION_PLACEHOLDER,
  StorefrontTextFields,
} from '../components/builder-workspace/field-selection/StorefrontTextFields';

function renderFields(overrides = {}) {
  const props = {
    fields: [
      {
        id: 'pageTitle',
        label: '페이지 제목',
        value: '',
        placeholder: '발안농협 영농센터 농자재 정보',
        hint: '비워두면 위 문구가 그대로 표시됩니다.',
      },
      {
        id: 'pageDescription',
        label: '페이지 설명',
        value: '',
        placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
        fillLabel: '예시문구 넣기',
      },
    ],
    onChange: vi.fn(),
    ...overrides,
  };

  render(<StorefrontTextFields {...props} />);

  return props;
}

describe('StorefrontTextFields', () => {
  it('labels each input', () => {
    renderFields();

    expect(screen.getByLabelText('페이지 제목')).toBeInTheDocument();
    expect(screen.getByLabelText('페이지 설명')).toBeInTheDocument();
  });

  it('shows the derived title as the placeholder so the merchant sees the default', () => {
    renderFields();

    expect(screen.getByLabelText('페이지 제목')).toHaveAttribute(
      'placeholder',
      '발안농협 영농센터 농자재 정보',
    );
  });

  it('reports edits by field id', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFields();

    await user.type(screen.getByLabelText('페이지 제목'), '봄');

    expect(onChange).toHaveBeenCalledWith('pageTitle', '봄');
  });

  it('fills the example text in one click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFields();

    await user.click(screen.getByRole('button', { name: '예시문구 넣기' }));

    expect(onChange).toHaveBeenCalledWith('pageDescription', PAGE_DESCRIPTION_PLACEHOLDER);
  });

  it('offers the fill button only on fields that name one', () => {
    renderFields();

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('hides the fill button once the field has a value', () => {
    renderFields({
      fields: [
        {
          id: 'pageDescription',
          label: '페이지 설명',
          value: '이미 적었습니다',
          placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
          fillLabel: '예시문구 넣기',
        },
      ],
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a hint when one is given', () => {
    renderFields();

    expect(
      screen.getByText('비워두면 위 문구가 그대로 표시됩니다.'),
    ).toBeInTheDocument();
  });
});
