import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InformationEntryFields } from '../components/builder-workspace/field-selection/InformationEntryFields';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }) => (
    <button type="button" onClick={() => onEmojiClick({ emoji: '🌱' })}>
      테스트 이모지 🌱
    </button>
  ),
}));

function Stateful({ initialEntries }) {
  const [entries, setEntries] = useState(initialEntries);

  return (
    <InformationEntryFields
      legend="사무소 안내"
      entries={entries}
      onChange={setEntries}
      descriptionPlaceholder="안내 문구"
    />
  );
}

describe('InformationEntryFields emoji picker', () => {
  it('이모지 버튼을 누르면 전체 이모지 선택기를 연다', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[{ id: 'ie-1', label: '', description: '비료 안내' }]}
      />,
    );

    expect(screen.queryByRole('dialog', { name: '이모지 선택' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '이모지' }));

    expect(screen.getByRole('dialog', { name: '이모지 선택' })).toBeInTheDocument();
  });

  it('선택한 이모지를 textarea의 현재 커서 위치에 넣는다', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[{ id: 'ie-1', label: '', description: '비료 안내' }]}
      />,
    );

    const description = screen.getByLabelText('설명');
    description.focus();
    description.setSelectionRange(2, 2);

    await user.click(screen.getByRole('button', { name: '이모지' }));
    await user.click(screen.getByRole('button', { name: '테스트 이모지 🌱' }));

    expect(description).toHaveValue('비료🌱 안내');
    await waitFor(() => {
      expect(description).toHaveFocus();
      expect(description.selectionStart).toBe(4);
    });
  });

  it('이모지 선택기 밖을 누르면 닫는다', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[{ id: 'ie-1', label: '', description: '비료 안내' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '이모지' }));
    expect(screen.getByRole('dialog', { name: '이모지 선택' })).toBeInTheDocument();

    await user.click(screen.getByText('사무소 안내'));

    expect(screen.queryByRole('dialog', { name: '이모지 선택' })).toBeNull();
  });

  it('Esc를 누르면 이모지 선택기를 닫고 버튼으로 돌아간다', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[{ id: 'ie-1', label: '', description: '비료 안내' }]}
      />,
    );

    const emojiButton = screen.getByRole('button', { name: '이모지' });
    await user.click(emojiButton);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '이모지 선택' })).toBeNull();
    expect(emojiButton).toHaveFocus();
  });

  it('선택한 문구를 지우지 않고 그 뒤에만 넣으며 다른 행은 건드리지 않는다', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[
          { id: 'ie-1', label: '', description: '비료 안내' },
          { id: 'ie-2', label: '', description: '농약 안내' },
        ]}
      />,
    );

    const descriptions = screen.getAllByLabelText('설명');
    descriptions[0].focus();
    descriptions[0].setSelectionRange(0, 2);

    await user.click(screen.getAllByRole('button', { name: '이모지' })[0]);
    await user.click(screen.getByRole('button', { name: '테스트 이모지 🌱' }));

    expect(descriptions[0]).toHaveValue('비료🌱 안내');
    expect(descriptions[1]).toHaveValue('농약 안내');
  });
});
