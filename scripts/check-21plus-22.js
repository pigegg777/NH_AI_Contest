// 21플러스복합, 파워22복합플러스 현재 DB 값 확인 및 사이트 검증
const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

async function getProductTitle(url) {
  const $ = await fetchHtml(url);
  if (!$) return '(fetch 실패)';
  const title = $('h3.pdTit, h2.pdTit, .tit_area h2, .prod-name, h1').first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr('content');
  return title || ogTitle || '(제목 없음)';
}

async function main() {
  // DB에서 현재 값 확인
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,img_url,product_url&product_code=in.(2100036870788,2100041275530)`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  console.log('현재 DB 값:');
  data.forEach(p => console.log(' -', p.product_code, p.product_name, '\n   url:', p.product_url, '\n   img:', p.img_url));

  console.log('\n사이트 제품명 확인:');
  for (const p of data) {
    if (p.product_url) {
      const title = await getProductTitle(p.product_url);
      console.log(` ${p.product_name} → 사이트제목: "${title}"`);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}

main().catch(console.error);
