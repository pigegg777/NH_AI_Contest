// scripts/verify-and-fill-pungno.js
// 풍농 DB 데이터 검증 + null 재시도
// 1. 채워진 42개: 저장된 wr_id로 사이트 접속 → 제품명 비교
// 2. null 32개: 풍농 카탈로그로 재매칭 시도

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const FN_BASE = 'https://www.npko.co.kr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HTTPS GET ────────────────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'text/html,*/*' }
    }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).setTimeout(12000, function () { this.destroy(); reject(new Error('timeout')); }).end();
  });
}

// ── 파싱 ────────────────────────────────────────────────────
function parseProducts(html) {
  const products = []; const seen = new Set();
  // bd_img → tit 순
  const re1 = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<\/a>/g;
  let m;
  while ((m = re1.exec(html)) !== null) {
    const wrId = m[2]; if (seen.has(wrId)) continue; seen.add(wrId);
    products.push({ wrId, name: m[4].trim(), productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`, imgUrl: m[3] });
  }
  // tit → bd_img 순
  const re2 = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<\/a>/g;
  while ((m = re2.exec(html)) !== null) {
    const wrId = m[2]; if (seen.has(wrId)) continue; seen.add(wrId);
    products.push({ wrId, name: m[3].trim(), productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`, imgUrl: m[4] });
  }
  return products;
}

// 상세 페이지에서 제품명 추출
function parseDetailTitle(html) {
  const m = html.match(/<div\s+class="tit[^"]*">([^<]+)<\/div>/) ||
            html.match(/<h2[^>]*class="bo_v_tit[^"]*">([^<]+)<\/h2>/) ||
            html.match(/class="bo_v_tit"[^>]*>([^<]+)</) ||
            html.match(/<title>([^<–]+)/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
function parseDetailImg(html) {
  const m = html.match(/src="(https:\/\/www\.npko\.co\.kr\/[^"]+\.(?:png|jpg|jpeg|gif|webp)[^"]*)"/i) ||
            html.match(/src="([^"]+npko[^"]+\.(?:png|jpg|jpeg|gif|webp)[^"]*)"/i);
  return m ? m[1] : '';
}

// ── 카탈로그 수집 ────────────────────────────────────────────
async function crawlCatalog() {
  const catalog = new Map();
  for (const ca of [10, 20, 30, 40, 50]) {
    await sleep(700);
    try {
      const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&ca1=${ca}`);
      parseProducts(html).forEach(p => { if (!catalog.has(p.wrId)) catalog.set(p.wrId, p); });
    } catch(e) { console.log(`ca1=${ca} 오류:`, e.message); }
  }
  // 보조 검색
  for (const term of ['요소', '칼리', '규산', '황산', '측조', '질산', '추비', '드론', '관주', '원예', '쌀', '콩', '감자', '고추']) {
    await sleep(400);
    try {
      const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=${encodeURIComponent(term)}`);
      parseProducts(html).forEach(p => { if (!catalog.has(p.wrId)) catalog.set(p.wrId, p); });
    } catch {}
  }
  return [...catalog.values()];
}

// ── 매칭 함수 (기존 스크립트와 동일) ─────────────────────────
const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));
const GENERIC = new Set(['플러스', '비료', '특호', '원예', '복합', '완효성', '황산', '추비']);

function lcsInfo(a, b) {
  let maxLen = 0, endI = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i-1] === b[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; if (dp[i][j] > maxLen) { maxLen = dp[i][j]; endI = i; } }
  return { len: maxLen, str: a.slice(endI - maxLen, endI) };
}

function hoMismatch(a, b) {
  const ha = (a.match(/(\d+)호/) || [])[1];
  const hb = (b.match(/(\d+)호/) || [])[1];
  return ha && hb && ha !== hb;
}
function isGenericMatch(a, b) {
  let maxLen = 0, maxStr = '';
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i-1] === b[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; if (dp[i][j] > maxLen) { maxLen = dp[i][j]; maxStr = a.slice(i-maxLen, i); } }
  return maxLen > 0 && GENERIC.has(maxStr);
}

function findBestMatch(dbName, catalog) {
  const fNorm = norm(dbName), mNorm = mainNorm(dbName);
  let best = null, bestScore = 0;
  for (const p of catalog) {
    const pNorm = norm(p.name);
    if (fNorm === pNorm || mNorm === pNorm) {
      if (hoMismatch(dbName, p.name)) continue;
      return { product: p, score: 9999 };
    }
    if (hoMismatch(dbName, p.name)) continue;
    let score = 0;
    const shorter = fNorm.length <= pNorm.length ? fNorm : pNorm;
    const longer  = fNorm.length <= pNorm.length ? pNorm : fNorm;
    if (shorter.length >= 3 && longer.includes(shorter) && !GENERIC.has(shorter))
      score = Math.max(score, 200 + shorter.length * 10);
    const mi = lcsInfo(mNorm, pNorm), fi = lcsInfo(fNorm, pNorm);
    if (!isGenericMatch(mNorm, pNorm)) {
      const pref = mNorm.startsWith(mi.str) || pNorm.startsWith(mi.str);
      score = Math.max(score, mi.len * (pref ? 3 : 2));
    }
    if (!isGenericMatch(fNorm, pNorm)) {
      const pref2 = fNorm.startsWith(fi.str) || pNorm.startsWith(fi.str);
      score = Math.max(score, fi.len * (pref2 ? 2 : 1));
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return (best && bestScore >= 9) ? { product: best, score: bestScore } : null;
}

// ── Supabase 업데이트 ─────────────────────────────────────────
async function uploadImage(product_code, imgUrl) {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'png').slice(0, 4);
    const fileName = `${product_code}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) return imgUrl;
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch { return imgUrl; }
}

async function updateDB(code, payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${code}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(payload),
  });
  return r.ok;
}

const SKIP_CATS = new Set(['맞춤형', 'bb', '소포장', 'BB']);
function shouldSkip(p) {
  if (SKIP_CATS.has(p.category)) return true;
  // 원예맞춤 2개 이상 공급업체
  if ((p.category === '원예맞춤') && (p.suppliers?.length ?? 0) >= 2) return true;
  return false;
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  const dryRun = process.env.DRY_RUN === '1';

  // DB 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const all = await res.json();
  const pungno = all.filter(p => (p.suppliers || []).includes('풍농'));
  const filled = pungno.filter(p => p.product_url);
  const missing = pungno.filter(p => !p.product_url && !shouldSkip(p));

  console.log(`풍농 총 ${pungno.length}개 | 채워진 ${filled.length}개 | 검사대상 null ${missing.length}개\n`);

  // ── 1단계: 카탈로그 수집 ────────────────────────────────────
  console.log('📦 풍농 카탈로그 수집 중...');
  const catalog = await crawlCatalog();
  console.log(`  ${catalog.length}개 확보\n`);
  const wrIdMap = new Map(catalog.map(p => [p.wrId, p]));

  // ── 2단계: 채워진 제품 검증 ──────────────────────────────────
  console.log('='.repeat(60));
  console.log('【검증】채워진 제품 - wr_id → 사이트 제품명 비교');
  console.log('='.repeat(60));
  let okCount = 0, mismatchCount = 0, unknownCount = 0;
  const mismatchList = [];

  for (const p of filled) {
    const wrIdMatch = p.product_url?.match(/wr_id=(\d+)/);
    if (!wrIdMatch) { console.log(`⚠️  [${p.product_name}] wr_id 없는 URL: ${p.product_url}`); unknownCount++; continue; }
    const wrId = wrIdMatch[1];
    const siteProduct = wrIdMap.get(wrId);

    let siteName = siteProduct?.name;
    if (!siteName) {
      // 카탈로그에 없으면 직접 상세 페이지 접속
      try {
        await sleep(600);
        const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`);
        siteName = parseDetailTitle(html) || '(파싱실패)';
      } catch { siteName = '(접속실패)'; }
    }

    const dbNorm = norm(p.product_name), siteNorm = norm(siteName);
    const mi = lcsInfo(mainNorm(p.product_name), norm(siteName));
    const isExact = dbNorm === siteNorm || mainNorm(p.product_name) === norm(siteName);
    const isClose = mi.len >= 3 && !GENERIC.has(mi.str);
    const hasHoMismatch = hoMismatch(p.product_name, siteName);

    if (isExact || (isClose && !hasHoMismatch)) {
      okCount++;
      if (!isExact) console.log(`🟡 [${p.product_name}] ↔ 사이트="${siteName}" (LCS="${mi.str}", len=${mi.len})`);
    } else {
      mismatchCount++;
      mismatchList.push({ code: p.product_code, dbName: p.product_name, siteName, wrId });
      console.log(`❌ [${p.product_name}] ↔ 사이트="${siteName}" (wr_id=${wrId})`);
    }
  }

  console.log(`\n✅ 정확/근접: ${okCount} | ❌ 불일치: ${mismatchCount} | ⚠️ 미확인: ${unknownCount}`);

  if (mismatchList.length > 0) {
    console.log('\n🔴 불일치 목록 → null 처리:');
    for (const m of mismatchList) {
      console.log(`  "${m.dbName}" → 사이트="${m.siteName}" (wr_id=${m.wrId})`);
      if (!dryRun) {
        await updateDB(m.code, { img_url: null, product_url: null });
        await sleep(300);
      }
    }
    if (dryRun) console.log('  (dry-run: 실제 null 처리 안 함)');
  }

  // ── 3단계: null 제품 재시도 ──────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`【재시도】null 제품 ${missing.length}개 카탈로그 재매칭`);
  console.log('='.repeat(60));
  let newSuccess = 0, stillNull = 0;

  for (const p of missing) {
    process.stdout.write(`[${p.product_name}] `);
    const result = findBestMatch(p.product_name, catalog);
    if (!result) {
      console.log('→ null (매칭 실패)');
      stillNull++;
      continue;
    }
    const { product: match, score } = result;
    console.log(`→ ✅ "${match.name}" (score=${score})`);

    if (!dryRun) {
      const storedImg = match.imgUrl ? await uploadImage(p.product_code, match.imgUrl) : null;
      await updateDB(p.product_code, { img_url: storedImg, product_url: match.productUrl });
      await sleep(500);
    } else {
      console.log(`   DRY: img=${match.imgUrl?.slice(0,50)}, url=${match.productUrl}`);
    }
    newSuccess++;
  }

  console.log(`\n재시도 성공: ${newSuccess} | 여전히 null: ${stillNull}`);

  // ── 최종 집계 ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,category,suppliers,img_url,product_url&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const all2 = await res2.json();
  const p2 = all2.filter(p => (p.suppliers||[]).includes('풍농'));
  const f2 = p2.filter(p => p.img_url && p.product_url);
  console.log(`최종 집계: 풍농 ${p2.length}개 | 채워진 ${f2.length}개 (${Math.round(f2.length/p2.length*100)}%)`);
}

main().catch(console.error);
