// 협화 백엔드 API 구조 분석
const API = 'https://hyeophwa-backend.p-e.kr';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Referer': 'https://www.khhc.co.kr/',
      'Origin': 'https://www.khhc.co.kr',
    }
  });
  console.log('HTTP:', res.status, url.slice(0, 100));
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { console.log('응답 (첫 500):', text.slice(0, 500)); return null; }
}

async function main() {
  // 1. 검색 API
  console.log('=== 검색 API: 땅심 ===');
  const searchData = await fetchJson(`${API}/products/search?keyword=%EB%95%85%EC%8B%AC`);
  if (searchData) {
    console.log('타입:', typeof searchData, Array.isArray(searchData) ? 'array' : 'object');
    if (Array.isArray(searchData)) {
      console.log('결과 수:', searchData.length);
      if (searchData.length > 0) {
        console.log('첫 번째 아이템 키:', Object.keys(searchData[0]));
        console.log('첫 번째 아이템:', JSON.stringify(searchData[0], null, 2).slice(0, 500));
      }
    } else {
      console.log('객체 키:', Object.keys(searchData));
      console.log('응답:', JSON.stringify(searchData, null, 2).slice(0, 500));
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // 2. 전체 목록 API
  console.log('\n=== 전체 목록 API ===');
  const listData = await fetchJson(`${API}/products/list?language=kor`);
  if (listData) {
    console.log('타입:', typeof listData, Array.isArray(listData) ? 'array('+listData.length+')' : 'object');
    if (Array.isArray(listData) && listData.length > 0) {
      console.log('키:', Object.keys(listData[0]));
      console.log('샘플 3개:', JSON.stringify(listData.slice(0, 3), null, 2).slice(0, 800));
    } else if (!Array.isArray(listData)) {
      console.log(JSON.stringify(listData, null, 2).slice(0, 500));
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // 3. 카테고리 목록
  console.log('\n=== 카테고리 목록 API ===');
  const cats = ['복합비료', '단비', '완효성', '기능성', '유기질비료'];
  for (const cat of cats) {
    const d = await fetchJson(`${API}/products/list?category=${encodeURIComponent(cat)}&language=kor`);
    if (Array.isArray(d)) console.log(` "${cat}": ${d.length}개`);
    else console.log(` "${cat}":`, JSON.stringify(d).slice(0, 100));
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(console.error);
