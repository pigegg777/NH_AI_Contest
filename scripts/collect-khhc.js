// scripts/collect-khhc.js
// 협화(khhc) 공급업체 제품 img_url + product_url 수집
// - 협화 백엔드 API(https://hyeophwa-backend.p-e.kr)에서 전체 제품 목록 조회
// - 유사도 매칭으로 DB 제품과 연결
// - 이미지 다운로드 → Supabase Storage 업로드

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const KHHC_API = 'https://hyeophwa-backend.p-e.kr';
const KHHC_SITE = 'https://www.khhc.co.kr';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 스킵 카테고리 (맞춤형, BB 는 null 처리)
const SKIP_CATEGORIES = ['맞춤형', 'BB'];

function isBlank(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

function isTargetProduct(product) {
  if (!Array.isArray(product?.suppliers) || !product.suppliers.includes('협화')) return false;
  if (SKIP_CATEGORIES.includes(product.category)) return false;
  // 원예맞춤 카테고리: suppliers 2개 이상이면 skip
  if (product.category === '원예맞춤' && product.suppliers.length >= 2) return false;
  // 이미 채워진 경우 skip
  if (!isBlank(product.img_url) && !isBlank(product.product_url)) return false;
  return true;
}

function normalizeForMatch(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')   // 괄호 제거
    .replace(/<[^>]+>/g, '')   // HTML 태그 제거
    .replace(/[^\p{L}\p{N}]+/gu, '')  // 특수문자/공백 제거
    .trim();
}

function similarity(a, b) {
  a = normalizeForMatch(a);
  b = normalizeForMatch(b);
  if (!a || !b) return -9999;
  if (a === b) return 2000;
  if (a.includes(b) || b.includes(a)) return 1000;
  // Levenshtein
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return -dp[m][n];
}

function buildSearchTerms(name) {
  const clean = String(name ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const terms = [clean];
  const noParen = clean.replace(/\(.*?\)/g, '').trim();
  if (noParen !== clean && noParen) terms.push(noParen);
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch) { const inner = parenMatch[1].split(',')[0].trim(); if (inner) terms.push(inner); }
  const base = noParen || clean;
  if (base.length > 3) { terms.push(base.slice(0, 3)); terms.push(base.slice(-3)); }
  if (base.length > 2) terms.push(base.slice(0, 2));
  return [...new Set(terms)];
}

// 협화 API: 검색 (혹은 전체 목록에서 매칭)
async function fetchAllKhhcProducts() {
  const res = await fetch(`${KHHC_API}/products/list?language=kor`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': KHHC_SITE + '/', 'Origin': KHHC_SITE }
  });
  if (!res.ok) { console.error('KHHC 전체 목록 조회 실패:', res.status); return []; }
  const data = await res.json();
  return data?.data ?? [];
}

async function searchKhhcProducts(keyword) {
  const res = await fetch(`${KHHC_API}/products/search?keyword=${encodeURIComponent(keyword)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': KHHC_SITE + '/', 'Origin': KHHC_SITE }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data ?? [];
}

function findBestMatch(productName, candidates) {
  if (!candidates.length) return null;
  const scored = candidates.map(c => ({ ...c, score: similarity(c.name, productName) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best.score >= -1 ? best : null; // 레벤슈타인 거리 1 이하만 허용 (N↔엔 같은 발음 차이만 허용)
}

async function uploadImage(product_code, imgUrl) {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('?')[0].split('.').pop().toLowerCase() || 'png').slice(0, 4);
    const fileName = `${product_code}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) { console.error('  이미지 업로드 실패:', up.status); return imgUrl; }
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch (e) { console.error('  이미지 업로드 오류:', e.message); return imgUrl; }
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

  // 1. DB에서 협화 제품 조회
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const allProducts = await dbRes.json();
  const targets = allProducts
    .filter(isTargetProduct)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : allProducts.length);

  console.log(`🎯 대상: ${targets.length}개 (협화 + img_url/product_url 누락${dryRun ? ', dry-run' : ''})\n`);

  // 2. 협화 전체 제품 목록 가져오기 (1번 API 호출로 캐시)
  console.log('📦 협화 전체 제품 목록 로딩...');
  const khhcProducts = await fetchAllKhhcProducts();
  console.log(`   ${khhcProducts.length}개 로드됨: ${khhcProducts.map(p => p.name).join(', ')}\n`);

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${p.product_name} `);

    // 3. 유사도 매칭: 전체 목록에서 먼저 시도
    let found = findBestMatch(p.product_name, khhcProducts);

    // 4. 못 찾으면 검색어 폴백으로 API 검색
    if (!found) {
      const terms = buildSearchTerms(p.product_name);
      for (const term of terms.slice(0, 3)) { // 처음 3개 폴백 시도
        await sleep(600);
        const searchResults = await searchKhhcProducts(term);
        found = findBestMatch(p.product_name, searchResults);
        if (found) break;
      }
    }

    if (!found) {
      console.log('→ null (매칭 실패)');
      failed++;
      continue;
    }

    // 5. 이미지 URL 처리
    const rawImgUrl = found.images;
    if (!rawImgUrl) {
      console.log(`→ null (이미지 없음: ${found.name})`);
      failed++;
      continue;
    }

    const productUrl = `${KHHC_SITE}/product?keyword=${encodeURIComponent(found.name)}`;

    const payload = {};
    if (isBlank(p.img_url)) {
      if (!dryRun) {
        const storedImg = await uploadImage(p.product_code, rawImgUrl);
        payload.img_url = storedImg;
      } else {
        payload.img_url = rawImgUrl.split('?')[0]; // dry-run: 서명 없는 URL
      }
    }
    if (isBlank(p.product_url)) payload.product_url = productUrl;

    if (Object.keys(payload).length === 0) {
      console.log('→ skip (채울 값 없음)');
      skipped++;
      continue;
    }

    if (!dryRun) {
      const ok = await updateDB(p.product_code, payload);
      if (!ok) { console.log('→ ❌ DB 업데이트 실패'); failed++; continue; }
    }

    console.log(`→ ✅ 협화 (${found.name})${dryRun ? ' DRY-RUN' : ''}`);
    if (dryRun) console.log('   payload:', JSON.stringify(payload, null, 2).slice(0, 200));
    success++;
    await sleep(500);
  }

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null ${failed} / 전체 ${targets.length}`);
}

main().catch(console.error);
