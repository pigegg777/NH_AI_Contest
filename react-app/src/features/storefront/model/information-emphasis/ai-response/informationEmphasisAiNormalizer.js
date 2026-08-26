import { parseInformationText } from '../../storefront-view/informationTextModel';

const MISSING_DESCRIPTION_ERROR_MESSAGE =
  'AI 응답에 안내 설명이 없어 적용하지 않았습니다.';
const CHANGED_TEXT_ERROR_MESSAGE =
  'AI 응답이 원문을 바꿔 적용하지 않았습니다.';

/**
 * 마커를 뺀 알맹이 글자. 파서가 이미 조각을 나눠 주므로 text 만 이어붙이면 된다.
 * 안 닫힌 기호는 파서가 평문으로 두기 때문에 그대로 남고, 그래서 AI가 `[[` 만
 * 흘리면 "글자가 늘었다"로 잡힌다 — 안 닫힌 마커는 판매자 화면에 기호가 그대로
 * 보이는 망가진 출력이라 통과시키면 안 된다.
 */
function plainTextOf(text) {
  return parseInformationText(text)
    .map((segment) => segment.text)
    .join('');
}

/**
 * AI는 마커만 끼워 넣기로 되어 있다. 프롬프트로 시키는 것만으로는 지켜졌는지
 * 알 방법이 없으므로, 마커를 걷어낸 글자가 원문과 다르면 응답을 버린다.
 */
export function normalizeInformationEmphasisResponse(
  payload,
  sourceDescription,
) {
  const description =
    typeof payload?.description === 'string' ? payload.description : '';

  if (description === '') {
    return { description: '', errorMessage: MISSING_DESCRIPTION_ERROR_MESSAGE };
  }

  if (plainTextOf(description) !== plainTextOf(sourceDescription)) {
    return { description: '', errorMessage: CHANGED_TEXT_ERROR_MESSAGE };
  }

  return { description, errorMessage: '' };
}
