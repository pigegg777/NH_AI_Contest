export const STOREFRONT_CHAT_MODE_OPTIONS = [
  {
    id: 'data',
    label: '대분류별 표시할 데이터선택',
    description: '영세가격,면세가격,분류등 보여줄 데이터를 선택',
  },
  {
    id: 'design',
    label: 'AI 디자인 수정',
    description: '공통 요소와 대분류별 카드 디자인을 한 작업 공간에서 이어서 수정',
  },
];

const STOREFRONT_DESIGN_TARGET_COMPOSER_COPY = {
  common: {
    title: '공통 요소 디자인 작업 공간',
    description:
      '미리보기를 유지한 채 페이지 전반 분위기와 탐색 요소를 조정합니다.',
    placeholder:
      '페이지 톤, 검색창, 카테고리 칩, 배너 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
  category: {
    title: '카드 디자인 작업 공간',
    description:
      '선택된 카테고리 카드의 상세 디자인을 이 작업 공간 안에서 이어서 조정합니다.',
    placeholder:
      '카드 레이아웃, 이미지 처리, 정보 영역, 강조 필드 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
};

export function getStorefrontChatScaffoldCopy(mode) {
  if (mode === 'idle') {
    return '수정하고 싶은 작업을 선택해주세요.';
  }

  if (mode === 'data') {
    return '카테고리 데이터와 노출 필드를 이 작업 공간 안에서 계속 조정할 수 있습니다.';
  }

  return '선택한 작업에 맞는 입력 영역이 여기에서 이어집니다.';
}

export function getStorefrontDesignComposerCopy(designTarget) {
  return STOREFRONT_DESIGN_TARGET_COMPOSER_COPY[designTarget] ?? null;
}
