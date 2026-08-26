import { toTrimmedString } from '../../../../common/utils/text';

/**
 * 사무소와 분류가 각각 들고 있는 안내 항목. 판매자가 쓰는 글이라 AI 디자인
 * 대상이 아니고, 스타일은 패널 CSS가 전부 정한다.
 */
export const MAX_INFORMATION_ENTRIES = 10;

// 저장된 id를 그대로 살리면서 새 항목에도 겹치지 않는 id를 준다. 배열 인덱스를
// React key로 쓰면 행을 지웠을 때 입력 중이던 값이 옆 행으로 딸려간다.
function randomEntryId() {
  return `ie-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInformationEntry() {
  return { id: randomEntryId(), label: '', description: '' };
}

export function normalizeInformationEntries(source, { legacyText = '' } = {}) {
  const usedIds = new Set();
  const entries = [];

  for (const item of Array.isArray(source) ? source : []) {
    if (entries.length >= MAX_INFORMATION_ENTRIES) {
      break;
    }

    const label = toTrimmedString(item?.label);
    const description = toTrimmedString(item?.description);

    if (!label && !description) {
      continue;
    }

    const savedId = toTrimmedString(item?.id);
    let id = savedId && !usedIds.has(savedId) ? savedId : randomEntryId();

    while (usedIds.has(id)) {
      id = randomEntryId();
    }

    usedIds.add(id);
    entries.push({ id, label, description });
  }

  if (entries.length > 0) {
    return entries;
  }

  // 옛 단일 문자열은 읽기 폴백으로만 산다. 콜론으로 자동 분리하면 본문에
  // 콜론이 든 문장을 망가뜨리므로 통째로 description에 넣는다.
  const legacy = toTrimmedString(legacyText);

  return legacy ? [{ id: randomEntryId(), label: '', description: legacy }] : [];
}
