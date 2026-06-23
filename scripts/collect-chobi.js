// scripts/collect-chobi.js
// 조비 공급업체 전체 재수집
// - /knco/product02Ajax.php POST (전체 목록 페이지네이션)
// - 로컬 유사도 매칭
// - 이미지 다운로드 → Supabase Storage 업로드
// - 전체 수정 (기존 데이터도 갱신)

const cheerio = require('cheerio');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const BASE = 'http://www.chobi.co.kr/knco';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 스킵 카테고리
const SKIP_CATEGORIES = ['맞춤형', 'BB', '소포장'];

function isBlank(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

function isTargetProduct(product) {
  if (!Array.isArray(product?.suppliers) || !product.suppliers.includes('조비')) return false;
  if (SKIP_CATEGORIES.includes(product.category)) return false;
  // 원예맞춤: suppliers 2개 이상 skip
  if (product.category === '원예맞춤' && product.suppliers.length >= 2) return false;
  return true;
}

function normalizeForMatch(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function similarity(siteProductName, dbProductName) {
  const a = normalizeForMatch(siteProductName);
  const b = normalizeForMatch(dbProductName);
  if (!a || !b) return -9999;
  if (a === b) return 2000;
  if (a.includes(b) || b.includes(a)) return 1000;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return -dp[m][n];
}

// 전체 제품 목록 수집 (페이지네이션)
async function fetchAllChobi() {
  const allItems = [];
  for (let page = 1; page <= 10; page++) {
    const body = new URLSearchParams({
      pageIndex: String(page), pageCountSize: '50', newType: '',
      skskSearch: '', skskSearch2: '', skskSearch3: '', skskSearch4: '',
      skskNowPage: 'product02Use.php', nxoInner: 'y'
    });
    const res = await fetch(`${BASE}/product02Ajax.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': `${BASE}/product02Use.php?nxoInner=y`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
    });
    if (!res.ok) break;
    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];
    $('a[href*="product02View"]').each((_, el) => {
      const name = $(el).find('dd.c1 strong').text().trim() || $(el).find('strong').text().trim();
      const href = $(el).attr('href');
      const imgSrc = $(el).find('span.img img').attr('src') || $(el).find('img').first().attr('src');
      if (name && href) items.push({ name, href, img: imgSrc || null });
    });
    if (items.length === 0) break;
    allItems.push(...items);
    await sleep(500);
  }
  // 중복 제거 (href 기준)
  return [...new Map(allItems.map(i => [i.href, i])).values()];
}

function findBestMatch(dbProductName, candidates) {
  if (!candidates.length) return null;
  const scored = candidates.map(c => ({ ...c, score: similarity(c.name, dbProductName) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best.score >= -1 ? best : null;
}

async function getDetailUrl(href) {
  // 깔끔한 상세 URL 생성
  const idxMatch = href.match(/skskIdx=(\d+)/);
  if (!idxMatch) return `${BASE}/${href}`;
  return `${BASE}/product02View.php?skskIdx=${idxMatch[1]}&nxoInner=y`;
}

async function uploadImage(product_code, imgUrl) {
  try {
    const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE } });
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'png').slice(0, 4);
    const fileName = `${product_code}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) { console.error(`  이미지 업로드 실패: ${up.status}`); return imgUrl; }
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch (e) { console.error('  이미지 오류:', e.message); return imgUrl; }
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
  const dryRun = process.env.DRY_RUN === '1';
  const limit = Number.parseInt(process.env.LIMIT || '', 10);

  // 1. DB에서 조비 제품 조회
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const allProducts = await dbRes.json();
  const targets = allProducts
    .filter(isTargetProduct)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : allProducts.length);

  console.log(`🎯 대상: ${targets.length}개 (조비 전체 수정${dryRun ? ', dry-run' : ''})\n`);

  // 2. 조비 사이트 전체 제품 목록 로딩 (페이지네이션)
  console.log('📦 조비 전체 제품 목록 로딩...');
  const siteProducts = await fetchAllChobi();
  console.log(`   ${siteProducts.length}개 로드됨\n`);

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    // 유사도 매칭
    const found = findBestMatch(p.product_name, siteProducts);

    if (!found) {
      console.log('→ null (매칭 실패)');
      failed++;
      continue;
    }

    const productUrl = await getDetailUrl(found.href);

    // 기존 값과 동일하면 skip (선택적)
    const sameUrl = p.product_url === productUrl;
    if (!isBlank(p.img_url) && sameUrl) {
      console.log(`→ skip (이미 최신: ${found.name})`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      let storedImg = p.img_url; // 기존 이미지 유지 (변경 없으면)
      if (found.img) {
        storedImg = await uploadImage(p.product_code, found.img);
      }
      const payload = { product_url: productUrl };
      if (found.img) payload.img_url = storedImg;

      const ok = await updateDB(p.product_code, payload);
      if (!ok) { console.log('→ ❌ DB 실패'); failed++; continue; }
      console.log(`→ ✅ 조비 (${found.name})`);
    } else {
      console.log(`→ ✅ DRY (${found.name}) img: ${found.img?.slice(0, 60) || 'null'}`);
    }
    success++;
    await sleep(300);
  }

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
