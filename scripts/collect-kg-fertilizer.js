// scripts/collect-kg-fertilizer.js
// KG케미칼 사이트에서 비료 이미지/상세링크 수집 → Supabase 업데이트
//
// KG 사이트 특성:
//   - 인코딩: EUC-KR
//   - 검색: POST /renew/product/product_search.php (GET 방식은 결과 없음)
//   - 더 안정적인 방법: 카테고리 페이지 전체 순회 후 LCS 기반 매칭
//   - DB supplier 표기: "KG케미칼"

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const https = require('https');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// KG 비료 카테고리 (광범위 탐색으로 추가 발견한 카테고리 포함)
// 020101: 단비 계열 (용과린, 입상과석)
// 030201: 원예기능성 (과일채소나라, 휴믹황원예, 흙살로, 유황감자비료, 콩비료, 원예1호복합 등)
const KG_CATEGORIES = [
  '001101', '000401', '000201', '001001', '000301', '000701', '000101', '000901',
  '020101', '030201',
];
const KG_BASE = 'http://www.kgchem.co.kr';

// ── HTTP GET (EUC-KR 디코딩) ──────────────────────────────
function fetchKG(pagePath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'www.kgchem.co.kr',
      path: pagePath,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(iconv.decode(Buffer.concat(chunks), 'euc-kr')));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ── KG 카테고리 페이지에서 제품 목록 추출 ──────────────────
function extractProducts(html) {
  const products = [];
  const re = /<li><a href="(product_view\.php\?[^"]+)"><div class="thum"><img src="([^"]+)"[^>]*><\/div><p>([^<]+)<\/p><\/a><\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[3].trim();
    if (name.includes('영상자료') || name.includes('농가사례')) continue;
    const imgSrc = m[2];
    const productUrl = `${KG_BASE}/renew/product/${m[1]}`;
    let imgUrl = null;
    if (!imgSrc.includes('noimg')) {
      imgUrl = imgSrc.startsWith('http') ? imgSrc : `${KG_BASE}/renew/${imgSrc.replace(/^\.\.\//, '')}`;
    }
    products.push({ name, productUrl, imgUrl });
  }
  return products;
}

// ── KG 사이트 전체 제품 크롤링 ─────────────────────────────
async function crawlAllKGProducts() {
  const all = [];
  for (const cat of KG_CATEGORIES) {
    await sleep(700 + Math.random() * 500);
    try {
      const html = await fetchKG(`/renew/product/product.php?category=${cat}`);
      const products = extractProducts(html);
      console.log(`  카테고리 ${cat}: ${products.length}개`);
      all.push(...products);
    } catch (e) {
      console.log(`  카테고리 ${cat}: 오류 (${e.message})`);
    }
  }
  return all;
}

// ── LCS (Longest Common Substring) ─────────────────────────
function longestCommonSubstring(a, b) {
  let maxLen = 0;
  // DP: O(n*m) - 한국어 제품명은 짧으므로 충분히 빠름
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    const curr = new Array(b.length + 1).fill(0);
    for (let j = 0; j < b.length; j++) {
      if (a[i] === b[j]) {
        curr[j + 1] = prev[j] + 1;
        if (curr[j + 1] > maxLen) maxLen = curr[j + 1];
      }
    }
    prev.splice(0, prev.length, ...curr);
  }
  return maxLen;
}

// ── 텍스트 정규화 ──────────────────────────────────────────
const normalize = s => s.toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[()（）\[\]<>]/g, '')
  .replace(/[,]/g, '');

// ── 괄호/꺽쇠 제거한 메인 이름 ────────────────────────────
const mainName = s => normalize(s.replace(/\([^)]*\)/g, '').replace(/<[^>]+>/g, ''));

// ── KG 사이트 제품과 DB 제품 매칭 (LCS 기반) ──────────────
// 전략:
//   1. 정확히 일치 → 9999
//   2. 메인 이름(괄호 제거)으로 LCS 계산 (긴 공통 부분이 더 신뢰할 수 있는 매칭)
//   3. 전체 이름으로 LCS 계산 (폴백)
//   4. LCS >= 3글자 이상만 유효 매칭으로 인정
function findBestMatch(dbProductName, kgProducts) {
  const fullNorm = normalize(dbProductName);
  const mainNorm = mainName(dbProductName);

  let best = null, bestScore = 0;
  for (const kg of kgProducts) {
    const kgNorm = normalize(kg.name);
    if (fullNorm === kgNorm || mainNorm === kgNorm) return { kg, score: 9999 };

    // 메인 이름 기준 LCS (괄호 내용 제외 → 제품 핵심명끼리 비교)
    const lcsMain = longestCommonSubstring(mainNorm, kgNorm);
    // 전체 이름 기준 LCS (괄호 내용 포함)
    const lcsFull = longestCommonSubstring(fullNorm, kgNorm);

    // 메인 이름 매칭에 더 높은 가중치
    // 예) "하이측조로(완효성)" mainNorm="하이측조로" vs "측조로한번만": lcsMain=3 → score=9
    //     "하이측조로(완효성)" fullNorm="하이측조로완효성" vs "미생물완효성": lcsMain=1, lcsFull=3 → score=3*2=6
    const score = Math.max(lcsMain * 3, lcsFull * 2);
    if (score > bestScore) { bestScore = score; best = kg; }
  }

  // 최소 LCS 3글자 = score >= 9 (mainNorm 기준) 또는 >= 6 (fullNorm 기준)
  // 짧은 2글자 브랜드("KG")가 타제품 "20kg"에 포함되는 오매칭 방지
  return (best && bestScore >= 9) ? { kg: best, score: bestScore } : null;
}

// ── skip 판단 ──────────────────────────────────────────────
function shouldSkip(p) {
  const cat = (p.category || '').toLowerCase();
  if (['맞춤형', 'bb', '소포장'].includes(cat)) return `skip(${p.category})`;
  if (cat === 'bb') return 'skip(BB)';
  return null;
}

// ── 이미지 Storage 업로드 ──────────────────────────────────
async function uploadImage(productCode, imgUrl) {
  if (!imgUrl) return null;
  try {
    const fetchFn = imgUrl.startsWith('https') ? https : http;
    const buf = await new Promise((resolve, reject) => {
      fetchFn.get(imgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': KG_BASE }
      }, (res) => {
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(10000, function() { this.destroy(); reject(new Error('img timeout')); });
    });

    const rawExt = imgUrl.split('.').pop().split('?')[0].toLowerCase();
    const ext = ['jpg','jpeg','png','gif','webp'].includes(rawExt) ? rawExt : 'jpg';
    const fileName = `${productCode}.${ext}`;
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeMap[ext],
          'x-upsert': 'true',
        },
        body: buf,
      }
    );
    if (!uploadRes.ok) {
      console.log(`    ⚠️  Storage 업로드 실패: ${await uploadRes.text()}`);
      return imgUrl;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
  } catch (e) {
    console.log(`    ⚠️  이미지 오류: ${e.message}`);
    return imgUrl;
  }
}

// ── DB 업데이트 ────────────────────────────────────────────
async function updateDB(productCode, imgUrl, productUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${productCode}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ img_url: imgUrl, product_url: productUrl }),
    }
  );
  return res.ok;
}

// ── DB에서 KG케미칼 제품 조회 ──────────────────────────────
async function fetchKGProducts() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const all = await res.json();
  return all.filter(p => (p.suppliers || []).includes('KG케미칼'));
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  // CLI 옵션: --force-rerun → img_url/product_url 있어도 재처리
  const forceRerun = process.argv.includes('--force-rerun');

  console.log('🔍 KG케미칼 사이트 제품 크롤링 시작...');
  const kgSiteProducts = await crawlAllKGProducts();
  console.log(`✅ KG 사이트 총 ${kgSiteProducts.length}개 제품 수집\n`);

  console.log('📦 Supabase KG케미칼 제품 조회 중...');
  const dbProducts = await fetchKGProducts();
  const toProcess = forceRerun ? dbProducts : dbProducts.filter(p => !p.img_url || !p.product_url);
  console.log(`총 KG케미칼 DB 제품: ${dbProducts.length}개 / 처리 대상: ${toProcess.length}개${forceRerun ? ' (force-rerun)' : ''}\n`);

  let success = 0, skipped = 0, failed = 0;
  const log = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    process.stdout.write(`[${i+1}/${toProcess.length}] ${p.product_name} (${p.category}) `);

    const skipReason = shouldSkip(p);
    if (skipReason) {
      console.log(`→ ${skipReason}`);
      skipped++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: skipReason });
      continue;
    }

    const result = findBestMatch(p.product_name, kgSiteProducts);

    if (!result) {
      console.log(`→ null (매칭 없음)`);
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'null' });
      // force-rerun 시 기존에 잘못 채워진 값을 null로 초기화
      if (forceRerun && (p.img_url || p.product_url)) {
        await updateDB(p.product_code, null, null);
      }
      continue;
    }

    const { kg, score } = result;
    console.log(`→ "${kg.name}" (LCS점수: ${score})`);

    await sleep(500 + Math.random() * 500);
    const storedImgUrl = await uploadImage(p.product_code, kg.imgUrl);
    const ok = await updateDB(p.product_code, storedImgUrl, kg.productUrl);

    if (ok) {
      success++;
      log.push({ product_code: p.product_code, product_name: p.product_name, matched: kg.name, status: 'ok', score });
    } else {
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'db_error' });
    }
  }

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'collect-kg-result.json'),
    JSON.stringify({ summary: { success, skipped, failed, total: toProcess.length }, log }, null, 2)
  );

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null/실패 ${failed} / 전체 ${toProcess.length}`);
  console.log('📄 상세 결과: data/collect-kg-result.json');

  const failures = log.filter(l => l.status === 'null');
  if (failures.length) {
    console.log('\n❌ 매칭 실패 목록 (KG 사이트에 해당 제품 없음):');
    failures.forEach(f => console.log(`  - ${f.product_name} (${f.product_code})`));
  }
}

main().catch(console.error);
