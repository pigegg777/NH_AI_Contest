import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FieldSelectionDock from '../components/builder-workspace/field-selection/FieldSelectionDock';
import { postInformationEmphasisAiRequest } from '../services/information-emphasis/informationEmphasisAiGateway';

vi.mock('../services/information-emphasis/informationEmphasisAiGateway', () => ({
  postInformationEmphasisAiRequest: vi.fn(),
}));

function buildDataMode(overrides = {}) {
  return {
    officeCode: 'OFF-1',
    categoryTabs: [
      { id: 'common', label: '공통 요소' },
      { id: '비료', label: '비료' },
    ],
    selectedCategoryId: 'common',
    selectCategory: vi.fn(),
    availableCategoryFields: [
      { key: 'product_name', label: '상품명', isSelectable: true },
    ],
    draftFields: ['product_name'],
    committedFields: ['product_name'],
    toggleField: vi.fn(),
    hasPendingChanges: false,
    goBack: vi.fn(),
    derivedPageTitle: '발안농협 영농센터 농자재 정보',
    textDraft: { pageTitle: '' },
    setTextDraft: vi.fn(),
    officeInfoEntries: [
      { id: 'ie-1', label: '영세가격 안내', description: '비료: 요소 20kg' },
    ],
    setOfficeInfoEntries: vi.fn(),
    categoryInfoEntries: [],
    setCategoryInfoEntries: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('field selection dock AI emphasis', () => {
  it('asks the AI on behalf of the office the builder is editing', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({
      description: '<<비료:>> 요소 20kg',
    });
    const user = userEvent.setup();
    render(
      <FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'AI 강조' }));

    await waitFor(() => {
      expect(postInformationEmphasisAiRequest).toHaveBeenCalledWith({
        officeCode: 'OFF-1',
        label: '영세가격 안내',
        description: '비료: 요소 20kg',
      });
    });
  });
});
