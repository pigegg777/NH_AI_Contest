// 킹콩 제품 상세 페이지 확인
const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

async function main() {
  // 킹콩(King Bean) 검색
  const url = BASE + '/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=' + encodeURIComponent('킹콩');
  const $ = await fetchHtml(url);
  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq && name) items.push({ seq, name });
  });
  const unique = [...new Map(items.map(i => [i.seq, i])).values()];
  console.log('킹콩 검색 결과:', unique);

  if (unique.length === 0) return;
  const best = unique[0];

  // 상세 페이지 텍스트 확인
  const detailUrl = `${BASE}/kor/product/product_ct02/view.do?seq=${best.seq}`;
  const $d = await fetchHtml(detailUrl);
  const img = $d('.swiper-slide img').first().attr('src');
  const bodyText = $d('body').text().replace(/\s+/g, ' ').slice(0, 500);
  console.log('\n상세 URL:', detailUrl);
  console.log('이미지:', img ? (img.startsWith('http') ? img : BASE + img) : null);
  console.log('본문 텍스트 (500자):', bodyText);

  // 킹콩 = 완효성 함유, 논콩 전용 여부 확인
  const hasKeywords = bodyText.includes('완효성') || bodyText.includes('논콩') || bodyText.includes('King Bean') || bodyText.includes('킹콩');
  console.log('\n키워드 확인 (완효성/논콩/KingBean/킹콩):', hasKeywords);

  // DB에서 현재 킹콩 제품 확인
  await new Promise(r => setTimeout(r, 1000));
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,img_url,product_url&product_name=ilike.*킹콩*`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const dbData = await dbRes.json();
  console.log('\nDB 킹콩 제품:', dbData);
}

main().catch(console.error);
