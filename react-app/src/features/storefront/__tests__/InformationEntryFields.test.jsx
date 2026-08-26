import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_INFORMATION_ENTRIES } from '../model/storefront-config/informationEntriesModel';
import { InformationEntryFields } from '../components/builder-workspace/field-selection/InformationEntryFields';

function Stateful({ initialEntries = [] }) {
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

describe('InformationEntryFields', () => {
  it('shows one blank row when there is nothing yet', () => {
    render(<Stateful />);

    expect(screen.getAllByLabelText('라벨')).toHaveLength(1);
    expect(screen.getAllByLabelText('설명')).toHaveLength(1);
  });

  it('takes the description as multiline text', () => {
    render(<Stateful />);

    expect(screen.getByLabelText('설명').tagName).toBe('TEXTAREA');
  });

  it('explains both rules where the merchant can see them without hovering', () => {
    render(<Stateful />);

    const help = screen.getByTestId('information-entry-help');

    expect(help.textContent).toContain('<< >>');
    expect(help.textContent).toContain('제목');
    expect(help.textContent).toContain('[[ ]]');
    expect(help.textContent).toContain('중요');
  });

  it('reports an edited label as a whole array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <InformationEntryFields
        legend="사무소 안내"
        entries={[{ id: 'a', label: '', description: '' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('라벨'), '영');

    expect(onChange).toHaveBeenCalledWith([
      { id: 'a', label: '영', description: '' },
    ]);
  });

  it('wraps the selected description text when the 중요 button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Stateful initialEntries={[{ id: 'a', label: '', description: '영세가격 안내' }]} />,
    );

    const description = screen.getByLabelText('설명');

    description.setSelectionRange(0, 4);
    await user.click(screen.getByRole('button', { name: '중요' }));

    expect(description).toHaveValue('[[영세가격]] 안내');
  });

  it('wraps the selected description text when the 제목 button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Stateful initialEntries={[{ id: 'a', label: '', description: '봄철 안내' }]} />,
    );

    const description = screen.getByLabelText('설명');

    description.setSelectionRange(0, 2);
    await user.click(screen.getByRole('button', { name: '제목' }));

    expect(description).toHaveValue('<<봄철>> 안내');
  });

  it('inserts an empty pair when nothing is selected', async () => {
    const user = userEvent.setup();

    render(<Stateful initialEntries={[{ id: 'a', label: '', description: '' }]} />);

    await user.click(screen.getByRole('button', { name: '중요' }));

    expect(screen.getByLabelText('설명')).toHaveValue('[[]]');
  });

  it('adds a row', async () => {
    const user = userEvent.setup();

    render(<Stateful initialEntries={[{ id: 'a', label: '가', description: '' }]} />);

    await user.click(screen.getByRole('button', { name: '항목 추가' }));

    expect(screen.getAllByLabelText('라벨')).toHaveLength(2);
  });

  it('removes the right row, leaving the other values in place', async () => {
    const user = userEvent.setup();

    render(
      <Stateful
        initialEntries={[
          { id: 'a', label: '가', description: '' },
          { id: 'b', label: '나', description: '' },
        ]}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: '항목 삭제' })[0]);

    const labels = screen.getAllByLabelText('라벨');

    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveValue('나');
  });

  it('hides the add button at the cap', () => {
    render(
      <Stateful
        initialEntries={Array.from(
          { length: MAX_INFORMATION_ENTRIES },
          (_, index) => ({ id: `e${index}`, label: `라벨 ${index}`, description: '' }),
        )}
      />,
    );

    expect(
      screen.queryByRole('button', { name: '항목 추가' }),
    ).not.toBeInTheDocument();
  });
});
