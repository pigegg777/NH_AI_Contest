export const STOREFRONT_CHAT_MODE_OPTIONS = [
  {
    id: 'data',
    label: '표시 항목 고르기',
    description: '영세가격, 면세가격, 분류 등 카드에 보여줄 항목을 고릅니다',
  },
  {
    id: 'design',
    label: '디자인 바꾸기',
    description: '색감과 글씨부터 카드 모양까지 말로 요청해 바꿉니다',
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
    starterPrompts: [
      '가격을 눈에 띄게 해줘',
      '글씨를 조금 더 크고 진하게 해줘',
      '전체적으로 차분한 색으로 바꿔줘',
      '검색창을 더 잘 보이게 해줘',
    ],
  },
  category: {
    title: '카드 디자인',
    description: '지금 고른 분류의 상품 카드에만 적용됩니다.',
    placeholder: '예) 사진을 크게 하고 상품명을 두 줄까지 보여줘',
    discardLabel: '뒤로가기',
    sendLabel: '미리보기에 반영',
    targetLabel: '수정 대상',
    starterPrompts: [
      '사진을 더 크게 보여줘',
      '상품명을 두 줄까지 보여줘',
      '가격을 제일 크게 강조해줘',
      '카드를 더 단순하게 정리해줘',
    ],
  },
};

export function getStorefrontDesignComposerCopy(designTarget) {
  return STOREFRONT_DESIGN_TARGET_COMPOSER_COPY[designTarget] ?? null;
}
