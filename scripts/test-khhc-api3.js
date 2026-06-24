// 협화 API 전체 목록 + 페이지네이션 확인
const API = 'https://hyeophwa-backend.p-e.kr';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.khhc.co.kr/', 'Origin': 'https://www.khhc.co.kr' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function main() {
  // 다양한 파라미터로 전체 목록 탐색
  const tests = [
    `${API}/products/list?language=kor`,
    `${API}/products/list?language=kor&page=1&limit=100`,
    `${API}/products/list?language=kor&per_page=100`,
    `${API}/products?language=kor`,
  ];

  for (const url of tests) {
    const r = await fetchJson(url);
    if (r) {
      const count = r.data ? (Array.isArray(r.data) ? r.data.length : 'object') : '?';
      console.log(`${url.replace(API, '')}: ${count}개`);
      if (r.total || r.pagination) console.log('  pagination:', r.total, r.pagination);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // 검색 API로 전체 범위 확인
  console.log('\n=== 다양한 검색어 테스트 ===');
  const terms = ['땅심', '원예', '비료', '파워', '측조', '완효', '엔케이', '복합'];
  for (const term of terms) {
    const r = await fetchJson(`${API}/products/search?keyword=${encodeURIComponent(term)}`);
    const count = r?.data?.length ?? 0;
    const names = r?.data?.map(p => p.name).join(', ') || '';
    console.log(`"${term}": ${count}개 → ${names.slice(0, 80)}`);
    await new Promise(r => setTimeout(r, 500));
  }

  // 전체 제품 목록 names
  const all = await fetchJson(`${API}/products/list?language=kor`);
  if (all?.data) {
    console.log('\n전체 목록 (names + images 존재 여부):');
    all.data.forEach(p => {
      console.log(` [${p.id}] "${p.name}" | category: ${p.category} | img: ${p.images ? '✅' : '❌'}`);
    });
  }
}

main().catch(console.error);
