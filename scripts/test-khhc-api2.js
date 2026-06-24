// 협화 API 전체 필드 + 이미지 URL 구조 확인
const API = 'https://hyeophwa-backend.p-e.kr';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.khhc.co.kr/', 'Origin': 'https://www.khhc.co.kr' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function main() {
  // 검색 API 전체 응답 보기
  const r1 = await fetchJson(`${API}/products/search?keyword=%EB%95%85%EC%8B%AC%EB%AA%85%EA%B0%80`);
  if (r1?.data?.[0]) {
    console.log('=== 검색 결과 전체 필드 ===');
    console.log(JSON.stringify(r1.data[0], null, 2));
  }

  await new Promise(r => setTimeout(r, 1000));

  // 전체 목록 API - 첫 번째 제품 전체 필드
  const r2 = await fetchJson(`${API}/products/list?language=kor`);
  if (r2?.data?.[0]) {
    console.log('\n=== 전체 목록 첫 번째 제품 전체 필드 ===');
    console.log(JSON.stringify(r2.data[0], null, 2));
    console.log('\n전체 제품 수:', r2.data.length);
    console.log('모든 제품명:', r2.data.map(p => p.name).join(', '));
  }

  await new Promise(r => setTimeout(r, 1000));

  // 개별 제품 API 테스트 (id=238)
  console.log('\n=== 개별 제품 API 테스트 ===');
  const r3 = await fetchJson(`${API}/products/238`);
  console.log('HTTP 결과:', JSON.stringify(r3, null, 2)?.slice(0, 300));

  const r4 = await fetchJson(`${API}/products/238?language=kor`);
  console.log('id 조회:', JSON.stringify(r4, null, 2)?.slice(0, 300));
}

main().catch(console.error);
