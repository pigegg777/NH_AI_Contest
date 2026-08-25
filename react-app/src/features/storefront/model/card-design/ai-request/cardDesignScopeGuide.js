export const CARD_DESIGN_SCOPE_GUIDES = [
  {
    scopeId: '',
    title: '카드 전체',
    rows: [
      { element: '배경색', example: '카드 배경을 아주 연한 베이지로 해줘' },
      { element: '테두리 색', example: '카드 테두리를 조금 진하게 해줘' },
      { element: '그림자', example: '카드에 옅은 그림자를 넣어줘' },
      { element: '모서리 둥글기', example: '카드 모서리를 더 둥글게 해줘' },
      { element: '안쪽 여백', example: '카드 안쪽 여백을 넉넉하게 해줘' },
      { element: '카드 구조', example: '제목은 위에 두고 이미지와 정보를 좌우로 나눠줘' },
      { element: '제목 위치', example: '제목을 카드 안쪽으로 넣어줘' },
    ],
    note: '전체를 고르면 위 항목을 한 번에 바꿀 수 있고, 옆의 칩을 고르면 그 영역만 바뀝니다.',
  },
  {
    scopeId: 'header',
    title: '상품명(제목) 영역',
    rows: [
      { element: '배경색', example: '제목 배경을 연한 초록으로 바꿔줘' },
      { element: '글자색', example: '제목 글자를 더 진하게 해줘' },
      { element: '글자 굵기', example: '제목을 더 굵게 해줘' },
      { element: '글자 크기', example: '제목을 한 단계 크게 해줘' },
      { element: '자간', example: '제목 자간을 조금 넓혀줘' },
      { element: '정렬', example: '제목을 가운데로 놓아줘' },
      { element: '줄 수', example: '상품명을 두 줄까지 보여줘' },
      { element: '여백', example: '제목 영역 여백을 넉넉하게 해줘' },
      { element: '테두리 색', example: '제목 아래 선을 연한 회색으로 해줘' },
      { element: '테두리 굵기', example: '제목 아래 선을 조금 굵게 해줘' },
      { element: '테두리 방향', example: '제목 영역을 사방 테두리로 감싸줘' },
    ],
    note: '제목 문구 자체는 바꿀 수 없습니다.',
  },
  {
    scopeId: 'image',
    title: '이미지 영역',
    rows: [
      { element: '채우기 방식', example: '이미지가 잘리지 않게 전체가 보이도록 해줘' },
      { element: '이미지 크기', example: '이미지를 조금 더 크게 해줘' },
    ],
    note: '위치와 자르기는 바꿀 수 없고, 사진이 없는 상품은 자동으로 숨겨집니다.',
  },
  {
    scopeId: 'info',
    title: '상품정보 영역',
    rows: [
      { element: '배경색', example: '정보 영역에 연한 회색 배경을 넣어줘' },
      { element: '테두리 색', example: '정보 영역 테두리를 연한 회색으로 해줘' },
      { element: '여백', example: '정보 영역 여백을 넉넉하게 해줘' },
      { element: '항목 간격', example: '항목 사이를 좀 좁혀줘' },
      { element: '그룹 간격', example: '묶음 사이를 넓혀줘' },
      { element: '항목 순서', example: '가격을 맨 위로 올려줘' },
      { element: '항목 묶음', example: '과세가격, 영세가격을 1줄에 나오도록 해줘' },
      { element: '라벨 색', example: '항목 이름을 더 연한 회색으로 해줘' },
      { element: '라벨 크기', example: '항목 이름을 한 단계 작게 해줘' },
      { element: '라벨 굵기', example: '항목 이름을 굵게 해줘' },
    ],
    note: '라벨은 항목 이름, 값은 실제 데이터입니다. 값 글씨는 옆의 상품정보 세부조정 칩에서 바꿉니다.',
  },
  {
    scopeId: 'field',
    title: '상품정보 세부조정',
    rows: [
      { element: '전체 글자색', example: '항목 글씨를 모두 진한 회색으로 해줘' },
      { element: '전체 굵기', example: '항목 글씨를 전체적으로 조금 굵게 해줘' },
      { element: '전체 글자 크기', example: '카드 글씨를 한 단계 크게 해줘' },
      { element: '글자색', example: '보조금만 파란색으로 바꿔줘' },
      { element: '굵기', example: '영세가격만 굵게 해줘' },
      { element: '글자 크기', example: '규격을 조금 작게 해줘' },
      { element: '강조', example: '상품명을 강조해줘' },
      { element: '가격 색상 일괄', example: '가격은 모두 빨간색으로 해줘' },
    ],
    note: '표시하기로 고른 항목만 바꿀 수 있습니다.',
  },
  {
    scopeId: 'description',
    title: '분류 설명 글자',
    rows: [
      { element: '글자색', example: '분류 설명을 조금 연한 회색으로 해줘' },
      { element: '글자 굵기', example: '분류 설명을 살짝 굵게 해줘' },
      { element: '글자 크기', example: '분류 설명을 한 단계 크게 해줘' },
      { element: '자간', example: '분류 설명 자간을 조금 넓혀줘' },
    ],
    note: '카드 목록 위에 보이는 분류 설명의 겉모습만 바뀌고, 문구 자체는 표시항목 선택에서 고칩니다.',
  },
];

const CARD_DESIGN_SCOPE_GUIDE_BY_SCOPE_ID = new Map(
  CARD_DESIGN_SCOPE_GUIDES.map((guide) => [guide.scopeId, guide]),
);

export function getCardDesignScopeGuide(scopeId) {
  if (typeof scopeId !== 'string') {
    return null;
  }

  return CARD_DESIGN_SCOPE_GUIDE_BY_SCOPE_ID.get(scopeId) ?? null;
}
