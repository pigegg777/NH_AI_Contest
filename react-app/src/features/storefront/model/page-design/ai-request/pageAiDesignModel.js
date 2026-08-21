import { toTrimmedString } from '../../../../../common/utils/text';

export const PAGE_AI_TARGET_SCOPE_OPTIONS = [
  {
    id: 'palette',
    label: '전체 색감',
    detail: '배경색과 포인트 색상',
  },
  {
    id: 'header',
    label: '헤더 텍스트 스타일',
    detail: '글자색, 굵기, 자간',
  },
  {
    id: 'categoryChips',
    label: '중분류 칩',
    detail: '배경색, 글자색, 테두리',
  },
  {
    id: 'productCategoryChips',
    label: '대분류 칩',
    detail: '배경색, 글자색, 테두리',
  },
  {
    id: 'search',
    label: '검색창',
    detail: '배경색, 테두리색, 크기',
  },
];

const PAGE_AI_TARGET_SCOPE_IDS = new Set(
  PAGE_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id),
);

export const DEFAULT_PAGE_AI_DESIGN = {
  prompt: '',
  targetScope: '',
};

export function normalizePageAiTargetScope(value) {
  return typeof value === 'string' && PAGE_AI_TARGET_SCOPE_IDS.has(value)
    ? value
    : '';
}

export function getPageAiTargetScopeOption(targetScope) {
  return (
    PAGE_AI_TARGET_SCOPE_OPTIONS.find((option) => option.id === targetScope) ??
    null
  );
}

export function buildPageAiTargetScopeInstruction(targetScope) {
  const targetScopeOption = getPageAiTargetScopeOption(targetScope);

  if (!targetScopeOption) {
    return '';
  }

  return [
    `선택한 수정 영역: ${targetScopeOption.label}`,
    `세부 기준: ${targetScopeOption.detail}`,
    '다른 영역은 변경하지 말고, 선택한 영역에 필요한 값만 제안하세요.',
  ].join('\n');
}

export function normalizePageAiDesignInput(pageAiDesign) {
  const source = pageAiDesign ?? {};

  const normalizePrompt = (value) => {
    if (typeof value !== 'string') {
      return '';
    }

    return toTrimmedString(value);
  };

  const targetScope = normalizePageAiTargetScope(source.targetScope);
  const directPrompt = normalizePrompt(source.prompt);

  if (directPrompt) {
    return {
      prompt: directPrompt,
      targetScope,
    };
  }

  const legacyPrompt = [
    normalizePrompt(source.mainPrompt),
    normalizePrompt(source.overridePrompt),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    prompt: legacyPrompt,
    targetScope,
  };
}
