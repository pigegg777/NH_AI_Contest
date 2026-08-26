import { useId, useRef, useState } from 'react';

import {
  MAX_INFORMATION_ENTRIES,
  createInformationEntry,
} from '../../../model/storefront-config/informationEntriesModel';
import { useInformationEmphasisAi } from '../../../hooks/useInformationEmphasisAi';
import styles from './FieldSelectionDock.module.css';

const EMPHASIS_BUTTONS = [
  { id: 'heading', label: '제목', open: '<<', close: '>>' },
  { id: 'important', label: '중요', open: '[[', close: ']]' },
];

/**
 * 안내 항목을 추가·삭제하는 반복 입력. 단일 문자열을 받는 StorefrontTextFields 와
 * 나눠 둔 이유는, 한 컴포넌트가 단일 필드와 반복 목록을 겸하면 양쪽 다 읽기
 * 나빠지기 때문이다.
 */
export function InformationEntryFields({
  legend,
  officeCode,
  entries,
  onChange,
  descriptionPlaceholder = '',
}) {
  const idPrefix = useId().replace(/:/g, '-');
  const descriptionRefs = useRef(new Map());
  // 빈 목록에 추가 버튼만 있으면 무슨 화면인지 알기 어렵다. 저장할 때 빈 항목은
  // 어차피 버려지므로 이 행은 공짜다. lazy useState로 한 번만 만들어야 한다 —
  // 렌더마다 createInformationEntry()를 새로 부르면 id가 매번 바뀌어서, entries가
  // 비어 있는 동안 바깥에서 온 리렌더가 key를 바꾸고 React가 textarea를
  // 언마운트/리마운트해 포커스와 커서 위치를 잃는다.
  const [placeholderEntry] = useState(() => createInformationEntry());
  const rows = entries.length > 0 ? entries : [placeholderEntry];

  const emphasisAi = useInformationEmphasisAi({
    officeCode,
    onApplyDescription: (entryId, description) =>
      updateEntry(entryId, 'description', description),
  });

  function updateEntry(entryId, key, value) {
    onChange(
      rows.map((entry) =>
        entry.id === entryId ? { ...entry, [key]: value } : entry,
      ),
    );
  }

  function removeEntry(entryId) {
    onChange(rows.filter((entry) => entry.id !== entryId));
  }

  // 판매자가 기호를 외워서 타이핑할 이유가 없어야 한다. 선택 영역을 감싸고,
  // 선택이 없으면 빈 쌍을 넣은 뒤 커서를 가운데로 옮긴다.
  function wrapSelection(entry, marker) {
    const field = descriptionRefs.current.get(entry.id);

    if (!field) {
      return;
    }

    const start = field.selectionStart ?? entry.description.length;
    const end = field.selectionEnd ?? entry.description.length;
    const selected = entry.description.slice(start, end);
    const nextValue =
      entry.description.slice(0, start) +
      marker.open +
      selected +
      marker.close +
      entry.description.slice(end);

    updateEntry(entry.id, 'description', nextValue);

    const caret = start + marker.open.length + selected.length;

    // 값이 반영된 뒤에 커서를 놓아야 한다. 같은 틱에 두면 리렌더가 덮어쓴다.
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  }

  return (
    <fieldset className={styles.entryFields}>
      <legend className={styles.entryFieldsLegend}>{legend}</legend>

      {rows.map((entry) => {
        const labelId = `${idPrefix}-${entry.id}-label`;
        const descriptionId = `${idPrefix}-${entry.id}-description`;
        const emphasisState = emphasisAi.stateFor(entry.id);

        return (
          <div key={entry.id} className={styles.entryRow}>
            <div className={styles.entryRowInputs}>
              <label className={styles.entryFieldLabel} htmlFor={labelId}>
                라벨
              </label>
              <input
                id={labelId}
                type="text"
                className={styles.textFieldInput}
                value={entry.label}
                onChange={(event) =>
                  updateEntry(entry.id, 'label', event.target.value)
                }
              />

              <label className={styles.entryFieldLabel} htmlFor={descriptionId}>
                설명
              </label>
              <div className={styles.entryDescriptionCell}>
                <textarea
                  id={descriptionId}
                  ref={(node) => {
                    if (node) {
                      descriptionRefs.current.set(entry.id, node);
                    } else {
                      descriptionRefs.current.delete(entry.id);
                    }
                  }}
                  className={`${styles.textFieldInput} ${styles.textFieldTextarea}`}
                  value={entry.description}
                  placeholder={descriptionPlaceholder}
                  rows={3}
                  onChange={(event) => {
                    // 판매자가 직접 고치기 시작하면 되돌리기 제안은 버려야 한다.
                    // 스냅샷은 AI 직전 원문 하나뿐이라, 그대로 두면 되돌리기가
                    // 방금 손으로 쓴 글까지 날린다.
                    emphasisAi.forget(entry.id);
                    updateEntry(entry.id, 'description', event.target.value);
                  }}
                />

                <div className={styles.entryEmphasisRow}>
                  {EMPHASIS_BUTTONS.map((marker) => (
                    <button
                      key={marker.id}
                      type="button"
                      className={styles.entryEmphasisButton}
                      onClick={() => wrapSelection(entry, marker)}
                    >
                      {marker.label}
                    </button>
                  ))}

                  {/* 손으로 넣는 삽입 버튼과 같은 일을 하므로 같은 줄에 둔다.
                      판매자가 배울 것은 "손으로 넣거나, AI에게 시키거나" 뿐이다. */}
                  <button
                    type="button"
                    className={styles.entryEmphasisButton}
                    onClick={() => emphasisAi.applyEmphasis(entry)}
                    disabled={
                      entry.description.trim() === '' || emphasisState.isPending
                    }
                  >
                    AI 강조
                  </button>
                </div>

                {emphasisState.isPending ? (
                  <p className={styles.entryEmphasisResult}>강조 넣는 중…</p>
                ) : emphasisState.errorMessage ? (
                  <p className={styles.entryEmphasisError}>
                    {emphasisState.errorMessage}
                  </p>
                ) : emphasisState.noticeMessage ? (
                  <p className={styles.entryEmphasisResult}>
                    {emphasisState.noticeMessage}
                    {emphasisState.canUndo ? (
                      <button
                        type="button"
                        className={styles.entryUndoButton}
                        onClick={() => emphasisAi.undo(entry.id)}
                      >
                        되돌리기
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className={styles.entryRemoveButton}
              onClick={() => removeEntry(entry.id)}
            >
              항목 삭제
            </button>
          </div>
        );
      })}

      <p className={styles.entryHelp} data-testid="information-entry-help">
        글자를 선택하고 버튼을 누르면 표시됩니다. {'<< >>'} 는 제목, {'[[ ]]'} 는
        중요로 보입니다. {'[비료]'} 처럼 하나만 쓴 괄호는 그대로 나옵니다.
      </p>

      {rows.length < MAX_INFORMATION_ENTRIES ? (
        <button
          type="button"
          className={styles.entryAddButton}
          onClick={() => onChange([...rows, createInformationEntry()])}
        >
          항목 추가
        </button>
      ) : null}
    </fieldset>
  );
}
