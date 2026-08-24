import { toTrimmedString } from '../../../../../common/utils/text';

export const PAGE_AI_TARGET_SCOPE_OPTIONS = [
  {
    id: 'palette',
    label: '화면 전체 색상',
    detail: '화면 배경과 포인트 색상',
  },
  {
    id: 'header',
    label: '상단 제목 글자',
    detail: '글자색, 굵기, 글자 간격',
  },
  {
    id: 'search',
    label: '상품 검색창',
    detail: '배경색, 테두리색, 크기',
  },
  {
    id: 'productCategoryChips',
    label: '상품 상단 카테고리 버튼',
    detail: '비료, 농약, 자재 버튼의 색상과 테두리',
  },
  {
    id: 'categoryChips',
    label: '상품 하단 세부카테고리 버튼',
    detail: '전체, 무기질비료, 종자종묘 버튼의 색상과 테두리',
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
