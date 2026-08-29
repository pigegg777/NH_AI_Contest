/**
 * 판매자가 안내 설명에 쓰는 강조 규칙. 기호를 두 번 겹쳐야 하는 이유는
 * `[비료]` `[신규]` 같은 홑대괄호 표기가 이 프로젝트 문구에 이미 쓰이고 있어,
 * 홑기호를 마커로 삼으면 평범하게 쓴 라벨이 갑자기 강조되기 때문이다.
 */
const MARKERS = [
  { open: '<<', close: '>>', style: 'heading' },
  { open: '[[', close: ']]', style: 'important' },
];

function findNextMarker(text, fromIndex) {
  let best = null;

  for (const marker of MARKERS) {
    const openAt = text.indexOf(marker.open, fromIndex);

    if (openAt === -1) {
      continue;
    }

    const closeAt = text.indexOf(marker.close, openAt + marker.open.length);

    // 닫히지 않은 여는 기호는 마커가 아니다. 뒷글자를 삼키지 않기 위해
    // 후보로 올리지 않고 평문으로 흘려보낸다.
    if (closeAt === -1) {
      continue;
    }

    // 빈 마커는 강조할 글자가 없으므로 평문으로 둔다. 빈 <strong> 을 만들지 않는다.
    if (closeAt === openAt + marker.open.length) {
      continue;
    }

    if (best === null || openAt < best.openAt) {
      best = { marker, openAt, closeAt };
    }
  }

  return best;
}

export function parseInformationText(text) {
  if (typeof text !== 'string' || text === '') {
    return [];
  }

  const segments = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = findNextMarker(text, cursor);

    if (found === null) {
      break;
    }

    if (found.openAt > cursor) {
      segments.push({ text: text.slice(cursor, found.openAt), style: 'plain' });
    }

    segments.push({
      text: text.slice(found.openAt + found.marker.open.length, found.closeAt),
      style: found.marker.style,
    });

    cursor = found.closeAt + found.marker.close.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), style: 'plain' });
  }

  return segments;
}
