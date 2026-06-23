// scripts/collect-nh-fertilizer.js
// 남해화학 사이트에서 비료 이미지/상세링크 수집 → Supabase 업데이트
//
// 남해화학 사이트 특성:
//   - URL: https://www.nhchem.co.kr/sub/product/fertilizer/list.html
//   - 검색: POST (search_txt 파라미터)
//   - 제품 상세: /sub/product/fertilizer/view2.html?idx=N  (절대경로 필수!)
//   - 이미지: /_upload/product/... (절대경로로 변환 필요)
//   - search_txt 파라미터 없이 idx만으로 product_url 저장 (깔끔한 URL)
//   - 사이트는 브랜드 완제품만 노출 → 요소/유안 등 원료성 제품은 null 처리
//
// 이전 스크립트 문제점 (수정됨):
//   1. product_url 경로 오류: /view2.html → /sub/product/fertilizer/view2.html
//   2. search_txt/curpage 파라미터 URL에 포함되어 클릭 시 오류 → 제거
//   3. 단순 문자열 포함 매칭 → LCS 기반 정확 매칭으로 교체

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const NH_BASE = 'https://www.nhchem.co.kr';
const NH_LIST = '/sub/product/fertilizer/list.html';

// ── HTTPS POST 검색 ────────────────────────────────────────
function nhSearch(searchTerm) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from('search_txt=' + encodeURIComponent(searchTerm));
    const req = https.request({
      hostname: 'www.nhchem.co.kr', path: NH_LIST, method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length,
        'Referer': NH_BASE + NH_LIST,
        'Accept': 'text/html,application/xhtml+xml,*/*'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── HTML에서 제품 목록 파싱 ────────────────────────────────
// 구조: <a href="view2.html?idx=N&..."> <strong>제품명</strong> <img src="/_upload/...">
function parseProducts(html) {
  const products = [];
  const re = /<a href="(view2\.html\?[^"]+)"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<img src="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const idxMatch = m[1].match(/idx=(\d+)/);
    if (!idxMatch) continue;
    const idx = idxMatch[1];
    const name = m[2].trim();
    const imgSrc = m[3];
    // search_txt, curpage 등 불필요 파라미터 제거한 깔끔한 URL
    const productUrl = `${NH_BASE}/sub/product/fertilizer/view2.html?idx=${idx}`;
    const imgUrl = imgSrc.startsWith('http') ? imgSrc : NH_BASE + imgSrc;
    products.push({ idx, name, productUrl, imgUrl });
  }
  return products;
}

// ── 남해화학 전체 제품 카탈로그 수집 ─────────────────────
async function crawlNHCatalog() {
  const catalog = new Map(); // idx → product

  // 다양한 검색어로 최대한 많은 제품 수집
  const searchTerms = [
    '', '비료', '요소', '칼리', '황산', '슈퍼', '오래가',
    '원예', '복합', '완효성', 'NK', '21', '염화', '쾌청',
    '고추', '과수', '논콩', '트리플', '바짝', '신세대',
    '잡곡', '한아름', '흙사랑', '토비', '씨알', '누보',
    '골드', '드론', '입상', '논밭'
  ];

  for (const term of searchTerms) {
    await sleep(600 + Math.random() * 400);
    try {
      const html = await nhSearch(term);
      const prods = parseProducts(html);
      let newCount = 0;
      for (const p of prods) {
        if (!catalog.has(p.idx)) { catalog.set(p.idx, p); newCount++; }
      }
      if (newCount > 0) console.log(`  검색 "${term}": +${newCount}개 (누적 ${catalog.size}개)`);
    } catch (e) {
      // 오류 시 조용히 넘김
    }
  }

  return [...catalog.values()];
}

// ── LCS (Longest Common Substring) 길이 ────────────────────
function lcsLength(a, b) {
  let max = 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    const curr = new Array(b.length + 1).fill(0);
    for (let j = 0; j < b.length; j++) {
      if (a[i] === b[j]) {
        curr[j + 1] = prev[j] + 1;
        if (curr[j + 1] > max) max = curr[j + 1];
      }
    }
    prev.splice(0, prev.length, ...curr);
  }
  return max;
}

// ── 텍스트 정규화 ──────────────────────────────────────────
const norm = s => s.toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[()（）\[\]<>]/g, '')
  .replace(/[,\/]/g, '');

const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));

// ── 최적 매칭 (LCS + 포함 관계 기반) ──────────────────────
// 우선순위:
//   1. 정규화 후 완전 일치 → 9999
//   2. fullNorm이 상대방을 포함(min 3글자) → 200 + len*10
//   3. 메인 이름(괄호 제거) LCS ≥ 3 → lcsMain*3
//   4. 전체 이름 LCS ≥ 3 → lcsFull*2
//
// 괄호 내 영문/코드명 처리:
//   "엔케이플러스인(NK+인)" → fullNorm "엔케이플러스인nk+인" 이 "nk+인" 포함 → 240점
//   vs "골드측조플러스" → mainLCS "플러스" 3글자 → 9점 → 올바르게 NK+인이 승리
function findBestMatch(dbName, nhProducts) {
  const fNorm = norm(dbName);
  const mNorm = mainNorm(dbName);

  let best = null, bestScore = 0;
  for (const p of nhProducts) {
    const pNorm = norm(p.name);
    if (fNorm === pNorm || mNorm === pNorm) return { product: p, score: 9999 };

    let score = 0;

    // 포함 관계 체크 (min 3글자, 짧은 쪽이 긴 쪽에 포함)
    const shorter = fNorm.length <= pNorm.length ? fNorm : pNorm;
    const longer  = fNorm.length <= pNorm.length ? pNorm : fNorm;
    if (shorter.length >= 3 && longer.includes(shorter)) {
      score = Math.max(score, 200 + shorter.length * 10);
    }

    // LCS 기반 점수
    const lcsMain = lcsLength(mNorm, pNorm);
    const lcsFull = lcsLength(fNorm, pNorm);
    score = Math.max(score, lcsMain * 3, lcsFull * 2);

    if (score > bestScore) { bestScore = score; best = p; }
  }

  // 유효 매칭: 포함 관계(score≥230) 또는 LCS 3글자(score≥9) 이상
  return (best && bestScore >= 9) ? { product: best, score: bestScore } : null;
}

// ── skip 판단 ──────────────────────────────────────────────
function shouldSkip(p) {
  const cat = (p.category || '').toLowerCase().replace(/\s/g, '');
  if (['맞춤형', 'bb', '소포장'].includes(cat)) return `skip(${p.category})`;
  return null;
}

// ── 이미지 다운로드 → Supabase Storage 업로드 ─────────────
async function uploadImage(productCode, imgUrl) {
  if (!imgUrl) return null;
  try {
    const isHttps = imgUrl.startsWith('https');
    const buf = await new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      client.get(imgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': NH_BASE }
      }, (res) => {
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject)
        .setTimeout(12000, function() { this.destroy(); reject(new Error('img timeout')); });
    });

    const rawExt = (imgUrl.split('.').pop().split('?')[0] || 'jpg').toLowerCase();
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const fileName = `${productCode}.${ext}`;
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext];

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mime,
          'x-upsert': 'true',
        },
        body: buf,
      }
    );
    if (!uploadRes.ok) {
      console.log(`    ⚠️  Storage 업로드 실패: ${(await uploadRes.text()).substring(0, 80)}`);
      return imgUrl; // 원본 URL 유지
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

// ── DB에서 남해화학 제품 조회 ─────────────────────────────
async function fetchNHProducts() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const all = await res.json();
  return all.filter(p => (p.suppliers || []).includes('남해화학'));
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  const forceRerun = process.argv.includes('--force-rerun');

  console.log('🔍 남해화학 사이트 제품 카탈로그 수집 중...');
  const nhCatalog = await crawlNHCatalog();
  console.log(`✅ NH 사이트 총 ${nhCatalog.length}개 제품 수집\n`);
  console.log('제품 목록:', nhCatalog.map(p => `${p.name}(idx:${p.idx})`).join(', '), '\n');

  console.log('📦 Supabase 남해화학 제품 조회 중...');
  const dbProducts = await fetchNHProducts();
  const toProcess = forceRerun
    ? dbProducts
    : dbProducts.filter(p => !p.img_url || !p.product_url);
  console.log(`총 NH DB 제품: ${dbProducts.length}개 / 처리 대상: ${toProcess.length}개${forceRerun ? ' (force-rerun)' : ''}\n`);

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

    const result = findBestMatch(p.product_name, nhCatalog);

    if (!result) {
      console.log('→ null (NH 사이트에 없음)');
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'null' });
      if (forceRerun && (p.img_url || p.product_url)) {
        await updateDB(p.product_code, null, null);
      }
      continue;
    }

    const { product: matched, score } = result;
    console.log(`→ "${matched.name}" (idx:${matched.idx}, LCS점수:${score})`);

    await sleep(400 + Math.random() * 400);
    const storedImgUrl = await uploadImage(p.product_code, matched.imgUrl);
    const ok = await updateDB(p.product_code, storedImgUrl, matched.productUrl);

    if (ok) {
      success++;
      log.push({
        product_code: p.product_code, product_name: p.product_name,
        matched: matched.name, idx: matched.idx, score, status: 'ok'
      });
    } else {
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'db_error' });
    }
  }

  // 결과 저장
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'collect-nh-result.json'),
    JSON.stringify({ summary: { success, skipped, failed, total: toProcess.length }, log }, null, 2)
  );

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null/실패 ${failed} / 전체 ${toProcess.length}`);
  console.log('📄 상세 결과: data/collect-nh-result.json');

  const nullList = log.filter(l => l.status === 'null');
  if (nullList.length) {
    console.log('\n❌ NH 사이트에 없는 제품들 (null 유지):');
    nullList.forEach(f => console.log(`  - ${f.product_name} (${f.product_code})`));
  }
}

main().catch(console.error);
