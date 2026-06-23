// scripts/retry-farmhannong-khhc.js
// img_url=null 제품 중 팜한농, 협화 공급업체만 재시도

const cheerio = require('cheerio');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요'); process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const delay = () => sleep(1000 + Math.random() * 1000);

function buildSearchTerms(name) {
  const clean = name.replace(/<[^>]+>/g, '').trim();
  const terms = [clean];
  const noParen = clean.replace(/\(.*?\)/g, '').trim();
  if (noParen !== clean) terms.push(noParen);
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].split(',')[0].trim();
    if (inner) terms.push(inner);
  }
  const base = noParen || clean;
  if (base.length > 3) { terms.push(base.slice(0, 3)); terms.push(base.slice(-3)); }
  if (base.length > 2) terms.push(base.slice(0, 2)); // 5단계: 앞 2글자
  return [...new Set(terms)];
}

function similarity(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a.includes(b) || b.includes(a)) return 1000;
  let dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return -dp[a.length][b.length];
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch { return null; }
}

const SEARCHERS = {
  팜한농: async (term) => {
    const base = 'https://www.farmhannong.com';
    const url = `${base}/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('#list02 a').map((_, el) => ({
      name: $(el).find('p, span, strong').first().text().trim() || $(el).text().trim(),
      url: new URL($(el).attr('href') || '/', base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get().filter(r => r.name && r.name.length > 1);
  },

  협화: async (term) => {
    // React 렌더링 가능성 있지만 keyword 파라미터로 시도
    const $ = await fetchHtml(`https://www.khhc.co.kr/product?keyword=${encodeURIComponent(term)}`);
    if (!$) return [];
    const results = [];
    // 여러 셀렉터 시도
    for (const sel of ['.sc-emMPjM a', '.sc-bsDpAt a', 'a[href*="product"]']) {
      $(sel).each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr('href');
        const img = $(el).find('img').attr('src') || null;
        if (name && name.length > 1 && href) results.push({ name, url: href, img });
      });
      if (results.length > 0) break;
    }
    return results;
  },
};

async function searchProduct(product, supplier) {
  const fn = SEARCHERS[supplier];
  if (!fn) return null;
  const terms = buildSearchTerms(product.product_name);
  for (const term of terms) {
    await delay();
    let results;
    try { results = await fn(term); } catch { results = []; }
    if (!results || results.length === 0) continue;
    const scored = results
      .map(r => ({ ...r, score: similarity(r.name, product.product_name) }))
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0 && scored[0].score > -10) return scored[0];
  }
  return null;
}

async function uploadImage(product_code, imgUrl) {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'jpg').slice(0, 4);
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

async function updateDB(product_code, img_url, product_url) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${product_code}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ img_url, product_url }),
    }
  );
  return res.ok;
}

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?img_url=is.null&select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const products = await res.json();

  const targets = products.filter(p =>
    (p.suppliers || []).some(s => ['팜한농', '협화'].includes(s))
  );

  console.log(`🎯 대상: ${targets.length}개 (img_url=null + 팜한농/협화 보유)\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    const suppliersToTry = ['팜한농', '협화'].filter(s => (p.suppliers || []).includes(s));
    let found = null, usedSupplier = null;

    for (const supplier of suppliersToTry) {
      found = await searchProduct(p, supplier);
      if (found) { usedSupplier = supplier; break; }
    }

    if (!found) { console.log('→ null'); failed++; continue; }

    let storedImgUrl = null;
    if (found.img) storedImgUrl = await uploadImage(p.product_code, found.img);
    await updateDB(p.product_code, storedImgUrl, found.url);
    console.log(`→ ✅ ${usedSupplier}`);
    success++;
  }

  console.log(`\n🎉 완료: 성공 ${success} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
