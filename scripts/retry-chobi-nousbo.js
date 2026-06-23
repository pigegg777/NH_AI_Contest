// scripts/retry-chobi-nousbo.js
// img_url이 null인 제품 대상으로 조비, 누보만 재시도

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
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

const SEARCHERS = {
  조비: async (term) => {
    const base = 'http://www.chobi.co.kr';
    // WordPress REST API 시도
    try {
      const res = await fetch(
        `${base}/wp/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=10&_fields=title,link,featured_media_src_url`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(p => ({
            name: p.title?.rendered || '',
            url: p.link || '',
            img: p.featured_media_src_url || null,
          })).filter(r => r.name);
        }
      }
    } catch {}
    // WooCommerce API 시도
    try {
      const res = await fetch(
        `${base}/wp/wp-json/wc/v3/products?search=${encodeURIComponent(term)}&per_page=10`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(p => ({
            name: p.name || '',
            url: p.permalink || '',
            img: p.images?.[0]?.src || null,
          })).filter(r => r.name);
        }
      }
    } catch {}
    const body = new URLSearchParams({ searchItemNm: term });
    let res;
    try {
      res = await fetch(`${base}/product/product_02/`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${base}/product/product_02/`,
        },
        body: body.toString(),
      });
    } catch { return []; }
    if (!res.ok) return [];
    const $ = cheerio.load(await res.text());
    const results = $('#skskList .list a').map((_, el) => ({
      name: $(el).find('.name, strong, p').first().text().trim() || $(el).text().trim(),
      url: new URL($(el).attr('href') || '/', base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get().filter(r => r.name);
    return results;
  },

  누보: async (_term) => {
    const base = 'https://www.nousbo.com';
    const allResults = [];
    // 5페이지 전체 수집
    for (let page = 1; page <= 5; page++) {
      const $ = await fetchHtml(`${base}/product1?page=${page}`);
      if (!$) break;
      const items = $('.thumbList.xet-row a').map((_, el) => ({
        name: $(el).text().trim(),
        url: new URL($(el).attr('href') || '/', base).href,
        img: $(el).find('img').attr('src')
          ? new URL($(el).find('img').attr('src'), base).href : null,
      })).get().filter(r => r.name && r.name.length > 1);
      allResults.push(...items);
      await delay();
    }
    return allResults;
  },
};

async function uploadImage(product_code, imgUrl) {
  let res;
  try { res = await fetch(imgUrl); } catch { return imgUrl; }
  if (!res.ok) return imgUrl;
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'jpg').slice(0, 4);
  const fileName = `${product_code}.${ext}`;
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': `image/${ext}`,
        'x-upsert': 'true',
      },
      body: buf,
    }
  );
  if (!uploadRes.ok) return imgUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
}

async function updateDB(product_code, img_url, product_url) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${product_code}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ img_url, product_url }),
    }
  );
  return res.ok;
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

async function main() {
  // img_url null인 것만 조회
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?img_url=is.null&select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const products = await res.json();

  // 조비 or 누보가 suppliers에 있는 것만 필터
  const targets = products.filter(p =>
    (p.suppliers || []).some(s => ['조비', '누보'].includes(s))
  );

  console.log(`🎯 대상: ${targets.length}개 (img_url=null + 조비/누보 보유)\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    // 조비 우선, 없으면 누보
    const suppliersToTry = ['조비', '누보'].filter(s => (p.suppliers || []).includes(s));
    let found = null;
    let usedSupplier = null;

    for (const supplier of suppliersToTry) {
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

  console.log(`\n🎉 완료: 성공 ${success} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
