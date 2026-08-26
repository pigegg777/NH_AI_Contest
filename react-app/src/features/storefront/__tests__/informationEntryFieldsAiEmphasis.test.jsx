import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InformationEntryFields } from '../components/builder-workspace/field-selection/InformationEntryFields';
import { postInformationEmphasisAiRequest } from '../services/information-emphasis/informationEmphasisAiGateway';

vi.mock('../services/information-emphasis/informationEmphasisAiGateway', () => ({
  postInformationEmphasisAiRequest: vi.fn(),
}));

const SOURCE = '비료: 요소 20kg 15,000원';
const MARKED = '<<비료:>> 요소 20kg 15,000원';

function Stateful({ initialEntries }) {
  const [entries, setEntries] = useState(initialEntries);

  return (
    <InformationEntryFields
      legend="사무소 안내"
      officeCode="OFF-1"
      entries={entries}
      onChange={setEntries}
      descriptionPlaceholder="안내 문구"
    />
  );
}

function renderOneRow(description = SOURCE) {
  render(
    <Stateful
      initialEntries={[{ id: 'ie-1', label: '영세가격 안내', description }]}
    />,
  );

  return {
    descriptionField: screen.getByLabelText('설명'),
    emphasisButton: screen.getByRole('button', { name: 'AI 강조' }),
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('InformationEntryFields AI emphasis', () => {
  it('disables the button while the description is empty', () => {
    const { emphasisButton } = renderOneRow('');

    expect(emphasisButton).toBeDisabled();
  });

  it('puts the marked-up text into that row', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const user = userEvent.setup();
    const { descriptionField, emphasisButton } = renderOneRow();

    await user.click(emphasisButton);

    await waitFor(() => {
      expect(descriptionField).toHaveValue(MARKED);
    });
    expect(postInformationEmphasisAiRequest).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      label: '영세가격 안내',
      description: SOURCE,
    });
  });

  it('restores the seller original when undo is clicked', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const user = userEvent.setup();
    const { descriptionField, emphasisButton } = renderOneRow();

    await user.click(emphasisButton);
    await waitFor(() => {
      expect(descriptionField).toHaveValue(MARKED);
    });

    await user.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(descriptionField).toHaveValue(SOURCE);
    expect(screen.queryByRole('button', { name: '되돌리기' })).toBeNull();
  });

  it('drops the undo offer once the seller edits the description again', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const user = userEvent.setup();
    const { descriptionField, emphasisButton } = renderOneRow();

    await user.click(emphasisButton);
    await screen.findByRole('button', { name: '되돌리기' });

    await user.type(descriptionField, '!');

    expect(screen.queryByRole('button', { name: '되돌리기' })).toBeNull();
    expect(descriptionField).toHaveValue(`${MARKED}!`);
  });

  it('keeps the text and shows the reason when the request fails', async () => {
    postInformationEmphasisAiRequest.mockRejectedValue(
      new Error('AI 응답이 원문을 바꿔 적용하지 않았습니다.'),
    );
    const user = userEvent.setup();
    const { descriptionField, emphasisButton } = renderOneRow();

    await user.click(emphasisButton);

    expect(
      await screen.findByText('AI 응답이 원문을 바꿔 적용하지 않았습니다.'),
    ).toBeInTheDocument();
    expect(descriptionField).toHaveValue(SOURCE);
  });

  it('says so when the model found nothing worth emphasizing', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: SOURCE });
    const user = userEvent.setup();
    const { descriptionField, emphasisButton } = renderOneRow();

    await user.click(emphasisButton);

    expect(await screen.findByText('강조할 곳을 찾지 못했어요.')).toBeInTheDocument();
    expect(descriptionField).toHaveValue(SOURCE);
  });
});
