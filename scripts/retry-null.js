// scripts/retry-null.js
// img_url=null 제품 대상으로 업데이트된 규칙으로 재시도

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const delay = () => sleep(1000 + Math.random() * 1000);

// ── 검색어 5단계 생성 ──────────────────────────────────────
function buildSearchTerms(name) {
  const cleanName = name.replace(/<[^>]+>/g, '').trim();
  const terms = [cleanName];
  const noParen = cleanName.replace(/\(.*?\)/g, '').trim();
  if (noParen !== cleanName) terms.push(noParen);
  const parenMatch = cleanName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].split(',')[0].trim();
    if (inner) terms.push(inner);
  }
  const base = noParen || cleanName;
  if (base.length > 3) {
    terms.push(base.slice(0, 3));
    terms.push(base.slice(-3));
  }
  // 5단계: 앞 2글자
  if (base.length > 2) terms.push(base.slice(0, 2));
  return [...new Set(terms)];
}

// ── 유사도 ────────────────────────────────────────────────
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch { return null; }
}

// ── 공급업체별 검색 ────────────────────────────────────────
const SEARCHERS = {
  남해화학: async (term) => {
    const base = 'https://www.nhchem.co.kr';
    const $ = await fetchHtml(`${base}/sub/product/fertilizer/list.html?search_txt=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('a:has(.thum_wrap)').map((_, el) => ({
      name: $(el).find('strong').text().trim(),
      url: (() => { try { return new URL($(el).attr('href'), base).href; } catch { return null; } })(),
      img: (() => { try { return $(el).find('img').attr('src') ? new URL($(el).find('img').attr('src'), base).href : null; } catch { return null; } })(),
    })).get().filter(r => r.name && r.url);
  },

  풍농: async (term) => {
    const base = 'https://www.npko.co.kr';
    const categories = [10, 20, 30, 40, 50];
    const all = [];
    for (const ca1 of categories) {
      const $ = await fetchHtml(`${base}/bbs/board.php?bo_table=s2_1&ca1=${ca1}&stx=${encodeURIComponent(term)}`);
      if (!$) continue;
      const items = $('a:has(.thumb)').map((_, el) => ({
        name: $(el).find('.tit').text().trim(),
        url: $(el).attr('href'),
        img: $(el).find('img.bd_img').attr('src') || null,
      })).get().filter(r => r.name);
      all.push(...items);
      if (items.length > 0) break; // 결과 있으면 다음 카테고리 skip
      await delay();
    }
    return all;
  },

  조비: async (term) => {
    const base = 'http://www.chobi.co.kr';
    // WordPress REST API
    try {
      const res = await fetch(
        `${base}/wp/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=10`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0)
          return data.map(p => ({ name: p.title?.rendered || '', url: p.link || '', img: null })).filter(r => r.name);
      }
    } catch {}
    // POST fallback
    try {
      const body = new URLSearchParams({ searchItemNm: term });
      const res = await fetch(`${base}/product/product_02/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
        body: body.toString(),
      });
      if (res.ok) {
        const $ = cheerio.load(await res.text());
        return $('#skskList .list a').map((_, el) => ({
          name: $(el).text().trim(),
          url: (() => { try { return new URL($(el).attr('href') || '/', base).href; } catch { return null; } })(),
          img: $(el).find('img').attr('src') || null,
        })).get().filter(r => r.name);
      }
    } catch {}
    return [];
  },

  누보: async (term) => {
    const base = 'https://www.nousbo.com';
    // productName 파라미터로 검색
    const $ = await fetchHtml(`${base}/product1?productName=${encodeURIComponent(term)}`);
    if (!$) return [];
    // 전체 5페이지 수집 (서버 필터링 안 하므로)
    const all = [];
    const firstItems = $('.thumbList.xet-row a').map((_, el) => ({
      name: $(el).text().trim(),
      url: (() => { try { return new URL($(el).attr('href') || '/', base).href; } catch { return null; } })(),
      img: (() => { try { return $(el).find('img').attr('src') ? new URL($(el).find('img').attr('src'), base).href : null; } catch { return null; } })(),
    })).get().filter(r => r.name && r.name.length > 1);
    all.push(...firstItems);

    // 나머지 페이지
    for (let page = 2; page <= 5; page++) {
      await delay();
      const $p = await fetchHtml(`${base}/product1?page=${page}`);
      if (!$p) break;
      const items = $p('.thumbList.xet-row a').map((_, el) => ({
        name: $p(el).text().trim(),
        url: (() => { try { return new URL($p(el).attr('href') || '/', base).href; } catch { return null; } })(),
        img: (() => { try { return $p(el).find('img').attr('src') ? new URL($p(el).find('img').attr('src'), base).href : null; } catch { return null; } })(),
      })).get().filter(r => r.name && r.name.length > 1);
      all.push(...items);
    }
    return all;
  },

  팜한농: async (term) => {
    const base = 'https://www.farmhannong.com';
    const params = new URLSearchParams({
      pageIndex: '1',
      productCt2: '',
      searchType: '전체',
      productCt1: 'PRODUCT_CT02',
      seq: '',
      productName: term,
    });
    const $ = await fetchHtml(`${base}/kor/product/product_ct02/list.do?${params}`);
    if (!$) return [];
    return $('#list02 a').map((_, el) => ({
      name: $(el).text().trim(),
      url: (() => { try { return new URL($(el).attr('href'), base).href; } catch { return null; } })(),
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },

  KG: async (term) => {
    const base = 'http://www.kgchem.co.kr';
    const $ = await fetchHtml(`${base}/renew/main/main.php?searchprd=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('.product_list a').map((_, el) => ({
      name: $(el).text().trim(),
      url: (() => { try { return new URL($(el).attr('href'), base).href; } catch { return null; } })(),
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },

  협화: async (term) => {
    const $ = await fetchHtml(`https://www.khhc.co.kr/product?keyword=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('.sc-emMPjM a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href') || null,
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },

  차세대케미컬: async (term) => {
    const $ = await fetchHtml(`https://ngchasedai.com/WEB_KR/bbs/SearchList.asp?menu=0&code=03_01&SearchWord=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('.wrap_btn_layout a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href') || null,
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },

  천지: async (term) => {
    const $ = await fetchHtml(`https://cheonjibio.com/bbs/board.php?bo_table=product_01&sop=and&sfl=wr_subject&stx=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('ul.bo_list li a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href') || null,
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },

  태흥: async (_term) => {
    const $ = await fetchHtml('https://www.treefertilizer.com/%EC%9B%90%EC%98%88%EC%9A%A9%EB%B9%84%EB%A3%8C');
    if (!$) return [];
    return $('#comp-kigmsvbw2 .Exmq9 a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href') || null,
      img: $(el).find('img').attr('src') || null,
    })).get().filter(r => r.name);
  },
};

const PRIORITY = ['남해화학', '풍농', '조비', '누보', '팜한농', 'KG', '협화', '차세대케미컬', '천지', '태흥'];
const SKIP_SUPPLIERS = ['세기'];

function sortedSuppliers(suppliers) {
  const filtered = (suppliers || []).filter(s => !SKIP_SUPPLIERS.includes(s));
  return [
    ...PRIORITY.filter(p => filtered.includes(p)),
    ...filtered.filter(s => !PRIORITY.includes(s)),
  ];
}

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
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
        body: buf,
      }
    );
    if (!uploadRes.ok) return imgUrl;
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
  console.log(`🎯 null 대상: ${products.length}개\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${p.product_name} `);

    const suppliers = sortedSuppliers(p.suppliers);
    if (suppliers.length === 0) {
      console.log('→ skip (세기만)');
      failed++;
      continue;
    }

    let found = null, usedSupplier = null;
    for (const supplier of suppliers) {
      found = await searchProduct(p, supplier);
      if (found) { usedSupplier = supplier; break; }
    }

    if (!found) {
      console.log('→ null');
      failed++;
      continue;
    }

    let storedImgUrl = null;
    if (found.img) storedImgUrl = await uploadImage(p.product_code, found.img);
    await updateDB(p.product_code, storedImgUrl, found.url);
    console.log(`→ ✅ ${usedSupplier}`);
    success++;
  }

  console.log(`\n🎉 완료: 성공 ${success} / null ${failed} / 전체 ${products.length}`);
}

main().catch(console.error);
