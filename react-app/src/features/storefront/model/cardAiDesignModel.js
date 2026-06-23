import { toTrimmedString } from '../../../common/utils/text';

export const CARD_AI_TARGET_SCOPE_OPTIONS = [
  {
    id: 'header',
    label: '제목 영역',
    detail: '배경색, 글자색, 굵기, 자간',
  },
  {
    id: 'image',
    label: '이미지',
    detail: '크기, 채우기 방식',
  },
  {
    id: 'info',
    label: '정보 영역',
    detail: '배경, 테두리, 간격, 묶음, 순서',
  },
  {
    id: 'field',
    label: '특정 항목',
    detail: '언급한 항목의 색상, 굵기, 강조',
  },
];

const CARD_AI_TARGET_SCOPE_IDS = new Set(CARD_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id));

export const DEFAULT_CARD_AI_DESIGN = {
  prompt: '',
  targetScope: '',
};

export function normalizeCardAiTargetScope(value) {
  return typeof value === 'string' && CARD_AI_TARGET_SCOPE_IDS.has(value) ? value : '';
}

export function getCardAiTargetScopeOption(targetScope) {
  return CARD_AI_TARGET_SCOPE_OPTIONS.find((option) => option.id === targetScope) ?? null;
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
    prompt: typeof source.prompt === 'string' ? toTrimmedString(source.prompt) : '',
    targetScope: normalizeCardAiTargetScope(source.targetScope),
  };
}

