// 슬래시 포함 제품명 및 사이트 다른 명칭 제품들 수동 보정
const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

async function searchFarmhannong(term) {
  const url = BASE + '/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=' + encodeURIComponent(term);
  const $ = await fetchHtml(url);
  if (!$) return [];
  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq && name) items.push({ seq, name });
  });
  return [...new Map(items.map(i => [i.seq, i])).values()];
}

async function getDetail(seq) {
  const url = `${BASE}/kor/product/product_ct02/view.do?seq=${seq}`;
  const $ = await fetchHtml(url);
  if (!$) return { url, img: null };
  const img = $('.swiper-slide img').first().attr('src');
  return { url, img: img ? (img.startsWith('http') ? img : BASE + img) : null };
}

async function uploadImage(product_code, imgUrl) {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'png').slice(0, 4);
    const fileName = `${product_code}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) return imgUrl;
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch { return imgUrl; }
}

async function updateDB(code, payload) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${code}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(payload),
    }
  );
  return res.ok;
}

// 슬래시 제거 후 검색, 첫 번째 결과 사용 (clear match only)
const SLASH_PRODUCTS = [
  { code: '2100034788757', name: '보리/밀/옥수수', searchTerm: '보리밀옥수수', expectedSiteName: '보리밀옥수수' },
  { code: '2100039753224', name: '입상황산가리(구형)', searchTerm: '입상황산가리', expectedSiteName: '입상황산가리' },
  { code: '2100032526344', name: '콩/땅콩/깨', searchTerm: '콩땅콩깨', expectedSiteName: null },
  { code: '2100034788511', name: '추비특호', searchTerm: '추비특', expectedSiteName: null },
  { code: '2100038410739', name: '파워 왕감자/고추', searchTerm: '파워왕감자', expectedSiteName: '파워왕감자' },
  { code: '2100047532484', name: '고구마/마/우엉', searchTerm: '고구마마우엉', expectedSiteName: null },
  { code: '2100033718496', name: '파워 플러스3 원예/밤', searchTerm: '파워플러스3', expectedSiteName: null },
  { code: '2100035782631', name: '롱스타골드', searchTerm: '롱스타골드', expectedSiteName: null },
  { code: '2100052424583', name: '원예맞춤7호(감자)', searchTerm: '원예맞춤7호', expectedSiteName: null },
];

async function main() {
  for (const p of SLASH_PRODUCTS) {
    console.log(`\n=== ${p.name} ===`);
    const results = await searchFarmhannong(p.searchTerm);
    console.log(`검색 "${p.searchTerm}":`, results.map(r => r.name).join(', ') || '없음');

    if (results.length === 0) { console.log('→ null (검색 결과 없음)'); await sleep(1200); continue; }

    // expected site name이 있으면 그것을 포함하는 결과 선택, 없으면 첫 번째
    let best = null;
    if (p.expectedSiteName) {
      best = results.find(r => r.name.includes(p.expectedSiteName) || p.expectedSiteName.includes(r.name));
    }
    if (!best && results.length === 1) best = results[0];
    if (!best) {
      console.log('→ null (명확한 매치 없음)');
      await sleep(1200);
      continue;
    }

    console.log(`→ 선택: "${best.name}" (seq=${best.seq})`);
    await sleep(1200);
    const detail = await getDetail(best.seq);
    if (!detail.img) { console.log('→ null (이미지 없음)'); await sleep(1200); continue; }

    const storedImg = await uploadImage(p.code, detail.img);
    const ok = await updateDB(p.code, { img_url: storedImg, product_url: detail.url });
    console.log(`→ ${ok ? '✅ 업데이트 완료' : '❌ DB 실패'} | img: ${storedImg}`);
    await sleep(1200);
  }
  console.log('\n완료');
}

main().catch(console.error);
