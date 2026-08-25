import { toTrimmedString } from '../../../../../common/utils/text';

export const CARD_AI_TARGET_SCOPE_OPTIONS = [
  {
    id: 'header',
    label: '상품명(제목) 영역',
    detail:
      '배경색, 글자색, 글자 굵기, 글자 크기, 자간, 정렬, 줄 수, 여백, 테두리 색, 테두리 굵기, 테두리 방향',
  },
  {
    id: 'image',
    label: '이미지 영역',
    detail: '채우기 방식, 이미지 크기',
  },
  {
    id: 'info',
    label: '상품정보 영역',
    detail:
      '배경색, 테두리 색, 여백, 항목 간격, 그룹 간격, 항목 순서, 항목 묶음, 라벨 색, 라벨 크기, 라벨 굵기',
  },
  {
    id: 'field',
    label: '상품정보 세부조정',
    detail:
      '전체 글자색, 전체 굵기, 전체 글자 크기, 글자색, 굵기, 글자 크기, 강조, 가격 색상 일괄',
  },
  {
    id: 'description',
    label: '분류 설명 글자',
    detail: '글자색, 글자 굵기, 글자 크기, 자간',
  },
];

const CARD_AI_TARGET_SCOPE_IDS = new Set(
  CARD_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id),
);

export const DEFAULT_CARD_AI_DESIGN = {
  prompt: '',
  targetScope: '',
};

export function normalizeCardAiTargetScope(value) {
  return typeof value === 'string' && CARD_AI_TARGET_SCOPE_IDS.has(value)
    ? value
    : '';
}

export function getCardAiTargetScopeOption(targetScope) {
  return (
    CARD_AI_TARGET_SCOPE_OPTIONS.find((option) => option.id === targetScope) ??
    null
  );
}

export function buildCardAiTargetScopeInstruction(targetScope) {
  const targetScopeOption = getCardAiTargetScopeOption(targetScope);

  if (!targetScopeOption) {
    return '';
  }

  return [
    `선택한 수정 영역: ${targetScopeOption.label}`,
    `세부 기준: ${targetScopeOption.detail}`,
    '다른 영역은 변경하지 말고, 선택한 영역에 필요한 값만 제안하세요.',
  ].join('\n');
}

export function normalizeCardAiDesignInput(cardAiDesign) {
  const source = cardAiDesign ?? {};

  return {
    prompt:
      typeof source.prompt === 'string' ? toTrimmedString(source.prompt) : '',
    targetScope: normalizeCardAiTargetScope(source.targetScope),
  };
}
