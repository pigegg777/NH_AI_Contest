// 팜한농 false positive 검증 및 수정
const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

async function getDetail(seq) {
  const url = `${BASE}/kor/product/product_ct02/view.do?seq=${seq}`;
  const $ = await fetchHtml(url);
  if (!$) return { url, img: null };
  const img = $('.swiper-slide img').first().attr('src');
  return {
    url,
    img: img ? (img.startsWith('http') ? img : BASE + img) : null,
  };
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

async function updateDB(product_code, payload) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${product_code}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(payload),
    }
  );
  return res.ok;
}

async function nullifyProduct(product_code, product_name) {
  console.log(`  NULLIFY: ${product_name} (${product_code})`);
  const ok = await updateDB(product_code, { img_url: null, product_url: null });
  console.log(`  → ${ok ? '✅' : '❌'}`);
}

async function main() {
  // 1. 뿌리조은 황플러스 - seq=5444 (븈리조은황플러스)로 수정
  console.log('\n=== [FIX] 뿌리조은 황플러스 → seq=5444 ===');
  const detail5444 = await getDetail(5444);
  console.log('img:', detail5444.img);
  console.log('url:', detail5444.url);
  const stored5444 = await uploadImage('2100052618913', detail5444.img);
  const ok5444 = await updateDB('2100052618913', { img_url: stored5444, product_url: detail5444.url });
  console.log('→', ok5444 ? '✅ 수정 완료' : '❌ 실패');

  await new Promise(r => setTimeout(r, 1500));

  // 2. 파워성장엔하이밸런스 - 팜한농 사이트에 없음 → null로 되돌리기
  console.log('\n=== [NULL] 파워성장엔하이밸런스 ===');
  await nullifyProduct('2100049395490', '파워성장엔하이밸런스(질산태, 황산칼리)');

  await new Promise(r => setTimeout(r, 1000));

  // 3. 반포로ok플러스 - 팜한농 사이트에 없음 → null로 되돌리기
  console.log('\n=== [NULL] 반포로ok플러스(완효성함유) ===');
  await nullifyProduct('2150001100457', '반포로ok플러스(완효성함유)');

  await new Promise(r => setTimeout(r, 1000));

  // 4. 21플러스복합 검증 - "21플러스" 검색
  console.log('\n=== [CHECK] 21플러스복합 ===');
  const url21 = `${BASE}/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=${encodeURIComponent('21플러스복합')}`;
  const $21 = await fetchHtml(url21);
  if ($21) {
    const items = [];
    $21('a[data-seq]').each((_, el) => {
      const seq = $21(el).attr('data-seq');
      const name = $21(el).find('p.tit span').text().trim() || $21(el).find('p.tit').text().trim();
      if (seq && name) items.push({ seq, name });
    });
    console.log('"21플러스복합" 검색 결과:', items);
  }

  await new Promise(r => setTimeout(r, 1000));

  // 5. 파워22복합플러스 검증
  console.log('\n=== [CHECK] 파워22복합플러스 ===');
  const url22 = `${BASE}/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=${encodeURIComponent('파워22복합플러스')}`;
  const $22 = await fetchHtml(url22);
  if ($22) {
    const items = [];
    $22('a[data-seq]').each((_, el) => {
      const seq = $22(el).attr('data-seq');
      const name = $22(el).find('p.tit span').text().trim() || $22(el).find('p.tit').text().trim();
      if (seq && name) items.push({ seq, name });
    });
    console.log('"파워22복합플러스" 검색 결과:', items);
  }

  console.log('\n완료');
}

main().catch(console.error);
