// scripts/collect-pungno-fertilizer.js
// 풍농(NPKO) 사이트에서 비료 이미지/상세링크 수집 → Supabase 업데이트
//
// 풍농 사이트 특성:
//   - 카테고리별 목록: https://www.npko.co.kr/bbs/board.php?bo_table=s2_1&ca1=10~50
//     ca1=10: 수도(벼)용  ca1=20: 원예/과수용  ca1=30: 관주용  ca1=40: 기타  ca1=50: 유기농
//   - 제품 구조: <a href="...&wr_id=N..."> <img.bd_img> <div.tit>제품명</div> </a>
//   - ⚠️ product_url 규칙: wr_id만 보존, stx/ca1/ca2 파라미터 제거
//     올바른 형식: https://www.npko.co.kr/bbs/board.php?bo_table=s2_1&wr_id=N
//   - 검색 GET: ?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=검색어 (보조 수단)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const FN_BASE = 'https://www.npko.co.kr';

// ── HTTPS GET ─────────────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html,*/*' }
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).setTimeout(12000, function () { this.destroy(); reject(new Error('timeout')); }).end();
  });
}

// ── HTML에서 제품 목록 파싱 ────────────────────────────────
// 구조: <a href="...wr_id=N..."> ... <img class="bd_img" src="..."> ... <div class="tit">이름</div> ... </a>
function parseProducts(html) {
  const products = [];
  const seen = new Set();
  // 방법 1: a 태그 전체 블록 파싱
  const re = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const wrId = m[2];
    if (seen.has(wrId)) continue;
    seen.add(wrId);
    products.push({
      wrId,
      name: m[4].trim(),
      productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`,
      imgUrl: m[3],
    });
  }
  // 방법 2: img src와 div.tit 순서가 반대인 경우
  const re2 = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<\/a>/g;
  while ((m = re2.exec(html)) !== null) {
    const wrId = m[2];
    if (seen.has(wrId)) continue;
    seen.add(wrId);
    products.push({
      wrId,
      name: m[3].trim(),
      productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`,
      imgUrl: m[4],
    });
  }
  return products;
}

// ── 풍농 전체 제품 카탈로그 수집 ─────────────────────────
async function crawlFNCatalog() {
  const catalog = new Map();

  // 카테고리별 순회 (ca1=10~50)
  for (const ca of [10, 20, 30, 40, 50]) {
    await sleep(600 + Math.random() * 400);
    try {
      const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&ca1=${ca}`);
      const prods = parseProducts(html);
      prods.forEach(p => { if (!catalog.has(p.wrId)) catalog.set(p.wrId, p); });
      if (prods.length) console.log(`  ca1=${ca}: ${prods.length}개 → ${prods.map(p => p.name + '(' + p.wrId + ')').join(', ')}`);
    } catch (e) {
      console.log(`  ca1=${ca}: 오류 (${e.message})`);
    }
  }

  // 보조 검색: 카탈로그 누락 가능성 있는 키워드
  const extraTerms = ['요소', '칼리', '규산', '황산', '측조', '석회', '유박', '유기'];
  for (const term of extraTerms) {
    await sleep(500);
    try {
      const url = `${FN_BASE}/bbs/board.php?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=${encodeURIComponent(term)}`;
      const html = await fetchPage(url);
      const prods = parseProducts(html);
      let newCnt = 0;
      prods.forEach(p => { if (!catalog.has(p.wrId)) { catalog.set(p.wrId, p); newCnt++; } });
      if (newCnt) console.log(`  검색 "${term}": +${newCnt}개 추가`);
    } catch { /* 무시 */ }
  }

  return [...catalog.values()];
}

// ── LCS (Longest Common Substring) - 길이 + 실제 문자열 반환 ─
function lcsInfo(a, b) {
  let maxLen = 0, endI = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) { maxLen = dp[i][j]; endI = i; }
      }
    }
  }
  const str = a.slice(endI - maxLen, endI);
  return { len: maxLen, str };
}
const lcsLength = (a, b) => lcsInfo(a, b).len;

const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));

// 오매칭 방지: 이 단어들만으로는 유효 매칭 불가 (너무 흔한 공통 접미/접두어)
const GENERIC_TERMS = new Set(['플러스', '비료', '특호', '원예', '복합', '완효성', '황산', '추비']);

// N호 제약: "원예맞춤N호" 류의 시리즈 번호가 다르면 거부
function hoNumberMismatch(dbName, siteName) {
  const dbHo  = (dbName.match(/(\d+)호/) || [])[1];
  const siteHo = (siteName.match(/(\d+)호/) || [])[1];
  return dbHo && siteHo && dbHo !== siteHo;
}

// LCS 매칭 문자열 자체가 generic 단어인지 확인
function isGenericMatch(a, b) {
  let maxLen = 0, maxStr = '';
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) { maxLen = dp[i][j]; maxStr = a.slice(i - maxLen, i); }
      }
    }
  }
  // LCS 문자열이 generic 목록에만 속하는지 확인
  return maxLen > 0 && GENERIC_TERMS.has(maxStr);
}

// ── 최적 매칭 (LCS + 포함관계 + N호 제약 + generic 방지) ─
function findBestMatch(dbName, fnProducts) {
  const fNorm = norm(dbName);
  const mNorm = mainNorm(dbName);

  let best = null, bestScore = 0;
  for (const p of fnProducts) {
    const pNorm = norm(p.name);
    if (fNorm === pNorm || mNorm === pNorm) {
      if (hoNumberMismatch(dbName, p.name)) continue;
      return { product: p, score: 9999 };
    }
    // N호 번호 불일치 → 즉시 거부
    if (hoNumberMismatch(dbName, p.name)) continue;

    let score = 0;
    // 포함 관계 (min 3글자, 단 generic 단어 제외)
    const shorter = fNorm.length <= pNorm.length ? fNorm : pNorm;
    const longer  = fNorm.length <= pNorm.length ? pNorm : fNorm;
    if (shorter.length >= 3 && longer.includes(shorter) && !GENERIC_TERMS.has(shorter)) {
      score = Math.max(score, 200 + shorter.length * 10);
    }
    // LCS 기반 (generic term 또는 suffix-only 매칭 시 감점/제외)
    const mainInfo = lcsInfo(mNorm, pNorm);
    const fullInfo = lcsInfo(fNorm, pNorm);
    if (!isGenericMatch(mNorm, pNorm)) {
      // LCS가 두 이름 중 하나의 앞부분(prefix)에 있으면 3배, 아니면 2배
      const isPrefix = mNorm.startsWith(mainInfo.str) || pNorm.startsWith(mainInfo.str);
      score = Math.max(score, mainInfo.len * (isPrefix ? 3 : 2));
    }
    if (!isGenericMatch(fNorm, pNorm)) {
      const isPrefix2 = fNorm.startsWith(fullInfo.str) || pNorm.startsWith(fullInfo.str);
      score = Math.max(score, fullInfo.len * (isPrefix2 ? 2 : 1));
    }

    if (score > bestScore) { bestScore = score; best = p; }
  }
  return (best && bestScore >= 9) ? { product: best, score: bestScore } : null;
}

// ── skip 판단 ──────────────────────────────────────────────
function shouldSkip(p) {
  const cat = (p.category || '').toLowerCase().replace(/\s/g, '');
  if (['맞춤형', 'bb', '소포장'].includes(cat)) return `skip(${p.category})`;
  return null;
}

// ── 이미지 업로드 ──────────────────────────────────────────
async function uploadImage(productCode, imgUrl) {
  if (!imgUrl) return null;
  try {
    const isHttps = imgUrl.startsWith('https');
    const buf = await new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      client.get(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': FN_BASE } }, (res) => {
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(12000, function () { this.destroy(); reject(new Error('img timeout')); });
    });
    const rawExt = (imgUrl.split('.').pop().split('?')[0] || 'jpg').toLowerCase();
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const fileName = `${productCode}.${ext}`;
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext];
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': mime, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) { console.log(`    ⚠️ Storage: ${(await up.text()).substring(0, 60)}`); return imgUrl; }
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch (e) {
    console.log(`    ⚠️ 이미지 오류: ${e.message}`);
    return imgUrl;
  }
}

// ── DB 업데이트 ────────────────────────────────────────────
async function updateDB(productCode, imgUrl, productUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${productCode}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ img_url: imgUrl, product_url: productUrl }),
  });
  return res.ok;
}

// ── DB에서 풍농 제품 조회 ─────────────────────────────────
async function fetchFNProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const all = await res.json();
  return all.filter(p => (p.suppliers || []).includes('풍농'));
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  const forceRerun = process.argv.includes('--force-rerun');

  console.log('🔍 풍농 사이트 카탈로그 수집 중...');
  const fnCatalog = await crawlFNCatalog();
  console.log(`✅ 풍농 사이트 총 ${fnCatalog.length}개 제품 수집\n`);

  console.log('📦 Supabase 풍농 제품 조회...');
  const dbProducts = await fetchFNProducts();
  const toProcess = forceRerun ? dbProducts : dbProducts.filter(p => !p.img_url || !p.product_url);
  console.log(`총 풍농 DB 제품: ${dbProducts.length}개 / 처리 대상: ${toProcess.length}개${forceRerun ? ' (force-rerun)' : ''}\n`);

  let success = 0, skipped = 0, failed = 0;
  const log = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${p.product_name} (${p.category}) `);

    const skipReason = shouldSkip(p);
    if (skipReason) {
      console.log(`→ ${skipReason}`);
      skipped++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: skipReason });
      continue;
    }

    const result = findBestMatch(p.product_name, fnCatalog);

    if (!result) {
      console.log('→ null (풍농 사이트에 없음)');
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'null' });
      if (forceRerun && (p.img_url || p.product_url)) await updateDB(p.product_code, null, null);
      continue;
    }

    const { product: matched, score } = result;
    console.log(`→ "${matched.name}" (wr_id:${matched.wrId}, 점수:${score})`);

    await sleep(350 + Math.random() * 350);
    const storedImgUrl = await uploadImage(p.product_code, matched.imgUrl);
    const ok = await updateDB(p.product_code, storedImgUrl, matched.productUrl);
    if (ok) {
      success++;
      log.push({ product_code: p.product_code, product_name: p.product_name, matched: matched.name, wrId: matched.wrId, score, status: 'ok' });
    } else {
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'db_error' });
    }
  }

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'collect-pungno-result.json'),
    JSON.stringify({ summary: { success, skipped, failed, total: toProcess.length }, log }, null, 2));

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null/실패 ${failed} / 전체 ${toProcess.length}`);
  console.log('📄 상세 결과: data/collect-pungno-result.json');

  const nullList = log.filter(l => l.status === 'null');
  if (nullList.length) {
    console.log('\n❌ 풍농 사이트에 없는 제품:');
    nullList.forEach(f => console.log(`  - ${f.product_name} (${f.product_code})`));
  }
}

main().catch(console.error);
