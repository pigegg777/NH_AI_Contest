import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_INFORMATION_ENTRIES } from '../../storefront-view/model/config-schema/informationEntriesModel';
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

// entries 는 건드리지 않고 부모만 리렌더시켜, 빈 목록일 때 그려지는 placeholder
// 행의 정체성이 바깥 리렌더에 흔들리지 않는지 본다. 패널의 다른 필드가 바뀌어도
// 이 컴포넌트는 다시 그려진다 — 그때마다 커서를 잃으면 안 된다.
function RerenderProbe() {
  const [entries, setEntries] = useState([]);
  const [, forceRerender] = useState(0);

  return (
    <>
      <button type="button" onClick={() => forceRerender((count) => count + 1)}>
        다시 렌더
      </button>
      <InformationEntryFields
        legend="사무소 안내"
        entries={entries}
        onChange={setEntries}
        descriptionPlaceholder="안내 문구"
      />
    </>
  );
}

describe('InformationEntryFields', () => {
  it('AI 강조는 없애고 수동 강조와 이모지는 유지한다', () => {
    render(<Stateful />);

    expect(screen.queryByRole('button', { name: 'AI 강조' })).toBeNull();
    expect(screen.getByRole('button', { name: '제목' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '중요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이모지' })).toBeInTheDocument();
  });

  it('shows one blank row when there is nothing yet', () => {
    render(<Stateful />);

    expect(screen.getAllByLabelText('라벨')).toHaveLength(1);
    expect(screen.getAllByLabelText('설명')).toHaveLength(1);
  });

  it('keeps the blank row identity stable across an outside re-render', async () => {
    const user = userEvent.setup();
    render(<RerenderProbe />);

    const before = screen.getByLabelText('설명');

    await user.click(screen.getByRole('button', { name: '다시 렌더' }));

    const after = screen.getByLabelText('설명');

    expect(after).toBe(before);
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

    // 세 행 중 가운데를 지운다: index 기반 filter((_, i) => i !== 1) 도 우연히
    // 같은 결과를 내므로, id 기반 제거인지 가려내려면 반드시 가운데 행이어야
    // 한다. 첫/끝 행을 지우면 index 기반 구현과 결과가 구분되지 않는다.
    render(
      <Stateful
        initialEntries={[
          { id: 'a', label: '가', description: '' },
          { id: 'b', label: '나', description: '' },
          { id: 'c', label: '다', description: '' },
        ]}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: '항목 삭제' })[1]);

    const labels = screen.getAllByLabelText('라벨');

    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveValue('가');
    expect(labels[1]).toHaveValue('다');
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
