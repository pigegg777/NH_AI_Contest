// scripts/retry-farmhannong.js
// 팜한농 공급업체 재수집
// suppliers에 팜한농이 있고 img_url 또는 product_url이 비어있는 행만 보강
// 목록 data-seq → view.do?seq= 상세 페이지 → 제품명 검증 → 필요한 필드만 업데이트

const cheerio = require('cheerio');
const {
  buildUpdatePayload,
  detailMatchesProduct,
  isBlank,
  isTargetProduct,
} = require('./retry-farmhannong-lib');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const BASE = 'https://www.farmhannong.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const delay = () => sleep(1000 + Math.random() * 1000);

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch { return null; }
}

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

async function searchFarmhannong(term) {
  const listUrl = `${BASE}/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=${encodeURIComponent(term)}`;
  const $ = await fetchHtml(listUrl);
  if (!$) return [];

  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq && name) items.push({ seq, name });
  });
  return items;
}

async function getDetail(seq) {
  const url = `${BASE}/kor/product/product_ct02/view.do?seq=${seq}`;
  const $ = await fetchHtml(url);
  if (!$) return { url, img: null, name: null, text: '' };
  const img = $('.swiper-slide img').first().attr('src');
  const pageText = $('body').text().replace(/\s+/g, ' ').trim();
  return {
    url,
    img: img ? (img.startsWith('http') ? img : `${BASE}${img}`) : null,
    name: null,
    text: pageText,
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

async function main() {
  const limit = Number.parseInt(process.env.LIMIT || '', 10);
  const dryRun = process.env.DRY_RUN === '1';
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const products = await res.json();
  const targets = products
    .filter(isTargetProduct)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : products.length);
  console.log(
    `🎯 대상: ${targets.length}개 (팜한농 + img_url/product_url 누락${dryRun ? ', dry-run' : ''})\n`
  );

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    const terms = buildSearchTerms(p.product_name);
    let found = null;

    for (const term of terms) {
      await delay();
      let items;
      try { items = await searchFarmhannong(term); } catch { items = []; }
      if (!items || items.length === 0) continue;

      const scored = items
        .map(r => ({ ...r, score: similarity(r.name, p.product_name) }))
        .sort((a, b) => b.score - a.score);
      if (scored.length > 0 && scored[0].score >= 500) { found = scored[0]; break; }
    }

    if (!found) { console.log('→ null'); failed++; continue; }

    // 상세 페이지에서 제품명과 이미지 추출
    await delay();
    const detail = await getDetail(found.seq);
    const verified = detailMatchesProduct({
      productName: p.product_name,
      foundName: found.name,
      detailName: detail.name,
      detailText: detail.text,
    });

    if (!verified) {
      console.log(`→ skip (상세 페이지 제품명 검증 실패: ${detail.url})`);
      skipped++;
      continue;
    }

    let storedImg = null;
    if (isBlank(p.img_url) && detail.img) {
      storedImg = await uploadImage(p.product_code, detail.img);
    }

    const payload = buildUpdatePayload(p, {
      imgUrl: storedImg,
      productUrl: detail.url,
    });

    if (Object.keys(payload).length === 0) {
      console.log('→ skip (채울 값 없음)');
      skipped++;
      continue;
    }

    if (!dryRun) {
      const updated = await updateDB(p.product_code, payload);
      if (!updated) {
        console.log('→ null (DB update 실패)');
        failed++;
        continue;
      }
    }

    console.log(`→ ✅ 팜한농 (${found.name}) ${dryRun ? JSON.stringify(payload) : ''}`.trim());
    success++;
  }

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
