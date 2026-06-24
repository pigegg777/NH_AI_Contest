// scripts/retry-chobi.js
// img_url=null + 조비 공급업체 제품 재수집 (product02Ajax.php 방식)

const cheerio = require('cheerio');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const delay = () => sleep(1000 + Math.random() * 1000);

const CHOBI_BASE = 'http://www.chobi.co.kr/knco';

function buildSearchTerms(name) {
  const clean = name.replace(/<[^>]+>/g, '').trim();
  const terms = [clean];
  const noParen = clean.replace(/\(.*?\)/g, '').trim();
  if (noParen !== clean) terms.push(noParen);
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch) { const inner = parenMatch[1].split(',')[0].trim(); if (inner) terms.push(inner); }
  const base = noParen || clean;
  if (base.length > 3) { terms.push(base.slice(0, 3)); terms.push(base.slice(-3)); }
  if (base.length > 2) terms.push(base.slice(0, 2));
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
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return -dp[a.length][b.length];
}

async function searchChobi(term) {
  const body = new URLSearchParams({
    pageIndex: '1', pageCountSize: '', newType: '',
    skskSearch: '', skskSearch2: '', skskSearch3: '',
    skskSearch4: term,
    skskNowPage: 'product02Use.php', nxoInner: 'y'
  });
  let res;
  try {
    res = await fetch(`${CHOBI_BASE}/product02Ajax.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${CHOBI_BASE}/product02Use.php?nxoInner=y`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
    });
  } catch { return []; }
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  return $('a[href*="product02View"]').map((_, el) => ({
    name: $(el).find('dd.c1 strong').text().trim(),
    url: `${CHOBI_BASE}/${$(el).attr('href')}`,
    img: $(el).find('span.img img').attr('src') || null,
  })).get().filter(r => r.name);
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
  const targets = products.filter(p => (p.suppliers || []).includes('조비'));
  console.log(`🎯 대상: ${targets.length}개 (img_url=null + 조비 보유)\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    const terms = buildSearchTerms(p.product_name);
    let found = null;
    for (const term of terms) {
      await delay();
      let results;
      try { results = await searchChobi(term); } catch { results = []; }
      if (!results || results.length === 0) continue;
      const scored = results.map(r => ({ ...r, score: similarity(r.name, p.product_name) })).sort((a, b) => b.score - a.score);
      if (scored.length > 0 && scored[0].score > -10) { found = scored[0]; break; }
    }

    if (!found) { console.log('→ null'); failed++; continue; }

    let storedImg = null;
    if (found.img) storedImg = await uploadImage(p.product_code, found.img);
    await updateDB(p.product_code, storedImg, found.url);
    console.log(`→ ✅ 조비`);
    success++;
  }

  console.log(`\n🎉 완료: 성공 ${success} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
