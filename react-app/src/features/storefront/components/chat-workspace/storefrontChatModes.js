export const STOREFRONT_CHAT_MODE_OPTIONS = [
  {
    id: 'page',
    label: '1. 페이지 전반 디자인 수정',
    description: '페이지 전반 스타일(배경색,분류칩) 수정.',
  },
  {
    id: 'data',
    label: '2. 대분류별 보여줄 데이터 수정',
    description: '영세가격,면세가격,분류등 보여줄 데이터를 선택',
  },
  {
    id: 'card',
    label: '3. 대분류별 상세 디자인 수정',
    description: '상품별 배경색,글자색등 상세 디자인 수정',
  },
  {
    id: 'advisory',
    label: '4. 통합 디자인 질문',
    description: '적용 전 상담형 질문과 방향 점검을 진행합니다.',
  },
];

const STOREFRONT_CHAT_COMPOSER_COPY = {
  page: {
    title: '페이지 디자인 작업 공간',
    description:
      '미리보기를 유지한 채 페이지 전반 분위기와 탐색 요소를 조정합니다.',
    placeholder:
      '페이지 톤, 검색창, 카테고리 칩, 배너 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
  card: {
    title: '카드 디자인 작업 공간',
    description:
      '선택된 카테고리 카드의 상세 디자인을 이 작업 공간 안에서 이어서 조정합니다.',
    placeholder:
      '카드 레이아웃, 이미지 처리, 정보 영역, 강조 필드 등에 대한 수정 요청을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '수정 대상',
  },
  advisory: {
    title: '통합 디자인 질문',
    description:
      '현재 적용 상태를 바탕으로 질문하고 다음 수정 방향을 점검합니다.',
    placeholder:
      '현재 스토어프론트 상태에 대해 궁금한 점이나 개선 방향을 입력하세요.',
    discardLabel: '뒤로가기',
    sendLabel: 'AI 요청하기',
    targetLabel: '',
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

export function getStorefrontComposerCopy(mode) {
  return STOREFRONT_CHAT_COMPOSER_COPY[mode] ?? null;
}
