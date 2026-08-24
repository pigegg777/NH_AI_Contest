export const PAGE_DESIGN_SCOPE_GUIDES = [
  {
    scopeId: '',
    title: '공통 요소',
    rows: [
      { element: '전체 색감', example: '가을 느낌으로 전체 색을 바꿔줘' },
      { element: '헤더', example: '제목을 더 크고 굵게 해줘' },
      { element: '중분류 칩', example: '중분류 칩을 알약 모양으로 해줘' },
      { element: '대분류 칩', example: '대분류 칩을 밑줄 탭처럼 보이게 해줘' },
      { element: '검색창', example: '검색창을 조금 크게 해줘' },
    ],
    note: '전체를 고르면 여러 영역을 함께 바꿀 수 있습니다. 한 영역만 바꾸려면 옆의 칩을 고르세요.',
  },
  {
    scopeId: 'palette',
    title: '화면 전체 색상',
    rows: [
      { element: '배경색', example: '페이지 배경을 아주 연한 베이지로 해줘' },
      { element: '포인트 색', example: '포인트 색을 짙은 초록으로 바꿔줘' },
    ],
    note: '색감만 바꿔도 헤더·칩·검색창 색은 따라 바뀌지 않습니다. 그건 옆의 칩에서 따로 요청하세요.',
  },
  {
    scopeId: 'header',
    title: '상단 제목 글자',
    rows: [
      { element: '글자색', example: '제목 글자를 더 진하게 해줘' },
      { element: '굵기', example: '제목을 더 굵게 해줘' },
      { element: '글자 크기', example: '제목을 조금 크게 해줘' },
      { element: '자간', example: '제목 자간을 넓혀줘' },
    ],
    note: '제목 문구 자체는 바꿀 수 없습니다.',
  },
  {
    scopeId: 'categoryChips',
    title: '상품 하단 세부카테고리 버튼',
    rows: [
      { element: '색상', example: '중분류 칩을 흰 배경에 초록 글씨로 해줘' },
      {
        element: '마우스 올렸을 때',
        example: '마우스를 올리면 연한 초록이 되게 해줘',
      },
      {
        element: '선택된 칩',
        example: '선택된 중분류 칩을 진한 초록으로 해줘',
      },
      { element: '모양', example: '중분류 칩을 알약 모양으로 해줘' },
      { element: '크기', example: '중분류 칩을 조금 크게 해줘' },
      { element: '칩 간격', example: '중분류 칩 사이를 좁혀줘' },
      { element: '테두리', example: '중분류 칩은 아래쪽 밑줄만 남겨줘' },
      { element: '글자 굵기', example: '중분류 칩 글씨를 굵게 해줘' },
    ],
    note: '상단 카테고리 버튼과 하단 세부카테고리 버튼은 따로 움직입니다. 둘 다 바꾸려면 각각 요청하세요.',
  },
  {
    scopeId: 'productCategoryChips',
    title: '상품 상단 카테고리 버튼',
    rows: [
      { element: '색상', example: '대분류 칩을 흰 배경에 초록 글씨로 해줘' },
      {
        element: '마우스 올렸을 때',
        example: '마우스를 올리면 연한 초록이 되게 해줘',
      },
      {
        element: '선택된 칩',
        example: '선택된 대분류 칩을 진한 초록으로 해줘',
      },
      { element: '모양', example: '대분류 칩 모서리를 각지게 해줘' },
      { element: '크기', example: '대분류 칩을 조금 크게 해줘' },
      { element: '칩 간격', example: '대분류 칩 사이를 넓혀줘' },
      { element: '테두리', example: '대분류 칩 테두리를 없애줘' },
      { element: '글자 굵기', example: '대분류 칩 글씨를 굵게 해줘' },
    ],
    note: '상단 카테고리 버튼과 하단 세부카테고리 버튼은 따로 움직입니다. 둘 다 바꾸려면 각각 요청하세요.',
  },
  {
    scopeId: 'search',
    title: '상품 검색창',
    rows: [
      { element: '배경색', example: '검색창 배경을 흰색으로 해줘' },
      { element: '테두리 색', example: '검색창 테두리를 연한 회색으로 해줘' },
      {
        element: '클릭했을 때 테두리',
        example: '검색창을 클릭하면 테두리가 초록이 되게 해줘',
      },
      { element: '테두리 두께', example: '검색창 테두리를 얇게 해줘' },
      { element: '크기', example: '검색창을 조금 크게 해줘' },
    ],
    note: '',
  },
];

const PAGE_DESIGN_SCOPE_GUIDE_BY_SCOPE_ID = new Map(
  PAGE_DESIGN_SCOPE_GUIDES.map((guide) => [guide.scopeId, guide]),
);

export function getPageDesignScopeGuide(scopeId) {
  if (typeof scopeId !== 'string') {
    return null;
  }

  return PAGE_DESIGN_SCOPE_GUIDE_BY_SCOPE_ID.get(scopeId) ?? null;
}
