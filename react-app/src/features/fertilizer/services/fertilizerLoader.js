const fertilizerData = [
  {
    productCode: 'N-001',
    productName: '요소 비료',
    fertilizerType: '질소',
    featureSummary: '질소 중심의 대표적인 비료로 엽채류와 벼 재배에 자주 사용됩니다.',
    usageLabel: '초기 생육 촉진',
    priceLabel: '20kg / 18,000원',
    supportLabel: '보조금 대상',
  },
  {
    productCode: 'NPK-210',
    productName: '복합 비료',
    fertilizerType: '복합',
    featureSummary: '질소, 인산, 칼리를 함께 공급하는 범용형 비료입니다.',
    usageLabel: '전반기 밑거름',
    priceLabel: '20kg / 24,000원',
    supportLabel: '일반 공급',
  },
  {
    productCode: 'ORG-130',
    productName: '유기질 비료',
    fertilizerType: '유기질',
    featureSummary: '토양 개량과 완효성 영양 공급을 함께 기대할 수 있습니다.',
    usageLabel: '토양 체력 보강',
    priceLabel: '20kg / 21,000원',
    supportLabel: '친환경 권장',
  },
  {
    productCode: 'K-080',
    productName: '칼리 비료',
    fertilizerType: '칼리',
    featureSummary: '작물의 내도복성과 품질 향상에 도움을 주는 칼리 비료입니다.',
    usageLabel: '결실기 품질 관리',
    priceLabel: '20kg / 22,500원',
    supportLabel: '일반 공급',
  },
];

export async function fetchFertilizerData() {
  return fertilizerData;
}
