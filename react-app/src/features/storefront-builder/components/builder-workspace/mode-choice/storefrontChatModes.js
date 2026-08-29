export const STOREFRONT_CHAT_MODE_OPTIONS = [
  {
    id: 'data',
    label: '카테고리별 표시항목·안내 작성',
    description: '표시항목을 고르고 안내 문구를 씁니다',
  },
  {
    id: 'design',
    label: 'AI 페이지 디자인',
    description: '페이지색의 글씨, 모양을 바꿉니다',
  },
];

const STOREFRONT_DESIGN_TARGET_COMPOSER_COPY = {
  common: {
    title: '페이지 전체 디자인',
    description: '색감, 검색창, 카테고리 버튼처럼 모든 화면에 함께 적용됩니다.',
    placeholder: '예) 배경을 조금 더 밝게 하고 가격을 눈에 띄게 해줘',
    discardLabel: '뒤로가기',
    sendLabel: '미리보기에 반영',
    targetLabel: '수정 대상',
  },
  category: {
    title: '카드 디자인',
    description: '지금 고른 분류의 상품 카드에만 적용됩니다.',
    placeholder: '예) 사진을 크게 하고 상품명을 두 줄까지 보여줘',
    discardLabel: '뒤로가기',
    sendLabel: '미리보기에 반영',
    targetLabel: '수정 대상',
  },
};

export function getStorefrontDesignComposerCopy(designTarget) {
  return STOREFRONT_DESIGN_TARGET_COMPOSER_COPY[designTarget] ?? null;
}
