// scripts/collect-nousbo-fertilizer.js
// 누보(Nousbo) 사이트에서 비료 이미지/상세링크 수집 → Supabase 업데이트
//
// 누보 사이트 특성:
//   - 제품 목록: https://www.nousbo.com/product1 (4개 카테고리: product1~4)
//   - 제품 구조: <a href="/product1/ID" class="link"> + <img src="/files/thumbnails/...">
//                <h5><a href="/product1/ID">제품명</a></h5>
//   - ⚠️ 이미지는 목록에서 상대경로 → 반드시 절대 URL 변환 필요
//     잘못된 예: "/files/thumbnails/025/066/320x320.crop.jpg" (이것이 이전 스크립트에서 저장 안된 원인)
//     올바른 예: "https://www.nousbo.com/files/thumbnails/025/066/320x320.crop.jpg"
//   - ⚠️ product_url 규칙: ID 경로만 사용, productName/page 파라미터 제거
//     올바른 형식: https://www.nousbo.com/product1/68443
//   - 단종 제품: 목록에서 사라져도 ID 직접 접근 가능 → 상세 페이지에서 이미지 수집
//   - 검색(productName GET 파라미터): 필터 역할 안 함 → 목록 전체 순회 + LCS 매칭 사용

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const NB_BASE = 'https://www.nousbo.com';

// ── HTTPS GET ─────────────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*', 'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, html: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject).setTimeout(15000, function () { this.destroy(); reject(new Error('timeout')); }).end();
  });
}

// ── 절대 URL 변환 ─────────────────────────────────────────
const toAbsUrl = src => src.startsWith('http') ? src : NB_BASE + src;

// ── 목록 페이지에서 제품 파싱 ─────────────────────────────
// 구조: <a href="/product1/ID" class="link"> → <img src="..."> → <h5><a>이름</a></h5>
function parseListProducts(html) {
  const products = [];
  const re = /<a\s+href="(\/product\d+\/(\d+))"\s+class="link"[^>]*>[\s\S]*?<img\s+src="([^"]+)"[^>]*>[\s\S]*?<h5[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const id = m[2];
    const imgSrc = m[3];
    const name = m[4].trim();
    if (!name) continue;
    products.push({
      id,
      name,
      productUrl: NB_BASE + path,
      imgUrl: toAbsUrl(imgSrc),
    });
  }
  return products;
}

// ── 상세 페이지에서 이미지 추출 (titleArea) ───────────────
function extractDetailImage(html) {
  // titleArea 내 첫 번째 img src (제품 대표 이미지)
  const titleAreaMatch = html.match(/titleArea[^>]*>[\s\S]*?<img\s+src="([^"]+)"/i);
  if (titleAreaMatch) return toAbsUrl(titleAreaMatch[1]);
  // fallback: files/thumbnails 패턴의 첫 img
  const thumbMatch = html.match(/src="(\/files\/thumbnails\/[^"]+)"/i);
  if (thumbMatch) return toAbsUrl(thumbMatch[1]);
  return null;
}

// ── 누보 전체 카탈로그 수집 (현재 목록 + 기존 URL에서 ID 추출) ─
async function crawlNBCatalog() {
  const catalog = new Map();

  // 1. 현재 목록 페이지 (product1~4) 순회
  for (const cat of [1, 2, 3, 4]) {
    for (let page = 1; page <= 5; page++) {
      await sleep(500 + Math.random() * 300);
      const url = `${NB_BASE}/product${cat}${page > 1 ? '?page=' + page : ''}`;
      try {
        const { html } = await fetchPage(url);
        const prods = parseListProducts(html);
        if (prods.length === 0) break;
        prods.forEach(p => { if (!catalog.has(p.id)) catalog.set(p.id, p); });
        if (prods.length > 0) console.log(`  product${cat} p${page}: ${prods.length}개`);
      } catch (e) { break; }
    }
  }

  console.log(`  현재 목록 수집: ${catalog.size}개`);
  return catalog;
}

// ── LCS (Longest Common Substring) ─────────────────────────
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
  return { len: maxLen, str: a.slice(endI - maxLen, endI) };
}

const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>®™]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));

// ── 최적 매칭 ─────────────────────────────────────────────
function findBestMatch(dbName, nbProducts) {
  const fNorm = norm(dbName);
  const mNorm = mainNorm(dbName);

  let best = null, bestScore = 0;
  for (const p of nbProducts) {
    const pNorm = norm(p.name);
    if (fNorm === pNorm || mNorm === pNorm) return { product: p, score: 9999 };

    let score = 0;
    // 포함 관계 (min 3글자)
    const shorter = fNorm.length <= pNorm.length ? fNorm : pNorm;
    const longer  = fNorm.length <= pNorm.length ? pNorm : fNorm;
    if (shorter.length >= 3 && longer.includes(shorter)) {
      score = Math.max(score, 200 + shorter.length * 10);
    }
    // LCS 기반 (prefix 가중치)
    const mi = lcsInfo(mNorm, pNorm);
    const fi = lcsInfo(fNorm, pNorm);
    if (mi.len >= 3) {
      const isPrefix = mNorm.startsWith(mi.str) || pNorm.startsWith(mi.str);
      score = Math.max(score, mi.len * (isPrefix ? 3 : 2));
    }
    if (fi.len >= 3) {
      const isPrefix2 = fNorm.startsWith(fi.str) || pNorm.startsWith(fi.str);
      score = Math.max(score, fi.len * (isPrefix2 ? 2 : 1));
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return (best && bestScore >= 9) ? { product: best, score: bestScore } : null;
}

// ── skip 판단 ──────────────────────────────────────────────
function shouldSkip(p) {
  const cat = (p.category || '').toLowerCase().replace(/\s/g, '');
  if (['소포장'].includes(cat)) return `skip(${p.category})`;
  return null;
}

// ── 이미지 업로드 ──────────────────────────────────────────
async function uploadImage(productCode, imgUrl) {
  if (!imgUrl) return null;
  try {
    const isHttps = imgUrl.startsWith('https');
    const buf = await new Promise((resolve, reject) => {
      (isHttps ? https : http).get(imgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': NB_BASE }
      }, (res) => {
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

// ── DB에서 누보 제품 조회 ─────────────────────────────────
async function fetchNBProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const all = await res.json();
  return all.filter(p => (p.suppliers || []).includes('누보'));
}

// ── 기존 product_url에서 clean URL 추출 ───────────────────
function cleanNBUrl(rawUrl) {
  if (!rawUrl) return null;
  const pathMatch = rawUrl.match(/(\/product\d+\/\d+)/);
  if (!pathMatch) return null;
  return NB_BASE + pathMatch[1];
}

// ── 단종/미목록 제품 알려진 ID 맵 ─────────────────────────
// 현재 product1 목록(20개)에는 없지만 상세 페이지 직접 접근 가능한 제품들
// (최초 수집 시 교차 검증 통과한 제품들)
const KNOWN_PRODUCT_URLS = {
  '더블드론NK':          'https://www.nousbo.com/product1/11583',
  '더블NK':              'https://www.nousbo.com/product1/11583',  // 더블드론NK 구버전명
  '투타임33':            'https://www.nousbo.com/product1/25171',
  '엔마스터 고추비료':   'https://www.nousbo.com/product1/44407',
  '고품질21복합':        'https://www.nousbo.com/product1/70618',
  '원타임골드22':        'https://www.nousbo.com/product1/70611',
  '원타임멀티시그':      'https://www.nousbo.com/product1/70608',
  '원타임 멀티 25(신규)':'https://www.nousbo.com/product1/70608',
  '원예고형비료':        'https://www.nousbo.com/product1/722',
  '골드요소(그래뉼)':   'https://www.nousbo.com/product1/73067',  // "요소 비료 (그래뉼)"
  '논편한 원타임 골드':  'https://www.nousbo.com/product1/70626',
  '원타임 29':           'https://www.nousbo.com/product1/70626',
};

// 검증에서 짧은 이름 매핑 예외 처리 (2글자 공통도 허용)
const LENIENT_VERIFY = new Set(['더블NK', '골드요소(그래뉼)']);

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  const forceRerun = process.argv.includes('--force-rerun');

  console.log('🔍 누보 사이트 카탈로그 수집 중...');
  const catalogMap = await crawlNBCatalog();
  const catalog = [...catalogMap.values()];
  console.log(`✅ 누보 카탈로그 ${catalog.length}개 수집\n`);

  console.log('📦 Supabase 누보 제품 조회...');
  const dbProducts = await fetchNBProducts();
  const toProcess = forceRerun ? dbProducts : dbProducts.filter(p => !p.img_url || !p.product_url);
  console.log(`총 누보 DB 제품: ${dbProducts.length}개 / 처리 대상: ${toProcess.length}개${forceRerun ? ' (force-rerun)' : ''}\n`);

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

    // 전략 1a: force-rerun 시 KNOWN_PRODUCT_URLS 우선 (DB URL은 이전 실행의 오매칭일 수 있음)
    //           일반 실행 시 DB URL → KNOWN_PRODUCT_URLS 순서로 시도
    let cleanUrl = forceRerun
      ? KNOWN_PRODUCT_URLS[p.product_name]
      : (cleanNBUrl(p.product_url) || KNOWN_PRODUCT_URLS[p.product_name]);
    let imgUrl = null;
    let matchedName = null;

    if (cleanUrl) {
      // 기존 URL 유효성 확인 + 이름 교차 검증
      await sleep(300 + Math.random() * 300);
      try {
        const { status, html } = await fetchPage(cleanUrl);
        if (status === 200 && html.length > 5000) {
          imgUrl = extractDetailImage(html);
          // 상세 페이지의 실제 제품명 추출
          const nameMatch = html.match(/titleArea[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/i);
          const pageName = nameMatch ? nameMatch[1].trim() : '';
          // DB 이름 vs 페이지 이름 교차 검증 (LCS)
          const verifyScore = (() => {
            if (!pageName) return 0;
            const dbN = norm(p.product_name), pgN = norm(pageName);
            if (dbN === pgN) return 9999;
            // 포함 관계 (min 3글자)
            const shorter = dbN.length <= pgN.length ? dbN : pgN;
            const longer  = dbN.length <= pgN.length ? pgN : dbN;
            if (shorter.length >= 3 && longer.includes(shorter)) return 200 + shorter.length * 10;
            // mainNorm LCS
            const mi = lcsInfo(norm(mainNorm(p.product_name)), pgN);
            if (mi.len >= 3) return mi.len * 3;
            // fullNorm LCS (괄호 안 내용도 포함)
            const fi = lcsInfo(dbN, pgN);
            if (fi.len >= 3) return fi.len * 2;
            // lenient 예외: 알려진 매핑에서 2글자 공통도 허용
            if (LENIENT_VERIFY.has(p.product_name)) {
              const li = lcsInfo(norm(mainNorm(p.product_name)), pgN);
              if (li.len >= 2) return li.len * 2;
            }
            return 0;
          })();
          matchedName = pageName || '(확인불가)';
          // lenient 예외는 낮은 임계값(4) 적용, 일반은 9
          const threshold = LENIENT_VERIFY.has(p.product_name) ? 4 : 9;
          if (verifyScore >= threshold) {
            console.log(`→ 기존ID(${cleanUrl.split('/').pop()}) "${matchedName}" [검증:${verifyScore}] 이미지:${imgUrl ? '✓' : '✗'}`);
          } else {
            console.log(`→ 기존ID 검증실패(DB:"${p.product_name}" vs 페이지:"${matchedName}" score:${verifyScore}) → LCS 매칭`);
            cleanUrl = null;
            imgUrl = null;
          }
        } else {
          cleanUrl = null;
        }
      } catch (e) {
        cleanUrl = null;
      }
    }

    // 전략 2: LCS 매칭으로 현재 카탈로그에서 찾기
    if (!cleanUrl) {
      const result = findBestMatch(p.product_name, catalog);
      if (!result) {
        console.log('→ null (누보 카탈로그에 없음)');
        failed++;
        log.push({ product_code: p.product_code, product_name: p.product_name, status: 'null' });
        if (forceRerun && (p.img_url || p.product_url)) await updateDB(p.product_code, null, null);
        continue;
      }
      const { product: matched, score } = result;
      cleanUrl = matched.productUrl;
      imgUrl = matched.imgUrl;
      matchedName = matched.name;
      console.log(`→ LCS: "${matched.name}" (점수:${score})`);
    }

    // 이미지 Storage 업로드
    await sleep(300 + Math.random() * 300);
    const storedImgUrl = await uploadImage(p.product_code, imgUrl);
    const ok = await updateDB(p.product_code, storedImgUrl, cleanUrl);
    if (ok) {
      success++;
      log.push({ product_code: p.product_code, product_name: p.product_name, matched: matchedName, status: 'ok', productUrl: cleanUrl });
    } else {
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'db_error' });
    }
  }

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'collect-nousbo-result.json'),
    JSON.stringify({ summary: { success, skipped, failed, total: toProcess.length }, log }, null, 2));

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null/실패 ${failed} / 전체 ${toProcess.length}`);
  console.log('📄 상세 결과: data/collect-nousbo-result.json');

  const nullList = log.filter(l => l.status === 'null');
  if (nullList.length) {
    console.log('\n❌ 누보 카탈로그에 없는 제품:');
    nullList.forEach(f => console.log(`  - ${f.product_name} (${f.product_code})`));
  }
}

main().catch(console.error);
