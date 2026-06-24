// scripts/retry-pungno-nulls.js
// 풍농 사이트 미존재 16개 → 핵심 키워드로 재검색 후 유사도 적절한 것만 업데이트

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 환경변수 필요'); process.exit(1); }

const FN_BASE = 'https://www.npko.co.kr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 풍농 사이트 요청 ─────────────────────────────────────────
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

function parseProducts(html) {
  const products = []; const seen = new Set();
  const re1 = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<\/a>/g;
  const re2 = /<a\s+href="(https:\/\/www\.npko\.co\.kr\/bbs\/board\.php\?[^"]*wr_id=(\d+)[^"]*)"[^>]*>[\s\S]*?<div\s+class="tit">([^<]+)<\/div>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*class="bd_img"[^>]*>[\s\S]*?<\/a>/g;
  let m;
  while ((m = re1.exec(html)) !== null) {
    const wrId = m[2]; if (seen.has(wrId)) continue; seen.add(wrId);
    products.push({ wrId, name: m[4].trim(), productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`, imgUrl: m[3] });
  }
  while ((m = re2.exec(html)) !== null) {
    const wrId = m[2]; if (seen.has(wrId)) continue; seen.add(wrId);
    products.push({ wrId, name: m[3].trim(), productUrl: `${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`, imgUrl: m[4] });
  }
  return products;
}

async function searchSite(keyword) {
  await sleep(600 + Math.random() * 400);
  try {
    const url = `${FN_BASE}/bbs/board.php?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=${encodeURIComponent(keyword)}`;
    const html = await fetchPage(url);
    return parseProducts(html);
  } catch { return []; }
}

// ── 유사도 함수 ──────────────────────────────────────────────
const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>\-_]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));

const GENERIC = new Set(['플러스', '비료', '특호', '원예', '복합', '완효성', '황산', '추비', '웃거름', '전용', '골드']);

function lcsInfo(a, b) {
  let maxLen = 0, endI = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i-1] === b[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; if (dp[i][j] > maxLen) { maxLen = dp[i][j]; endI = i; } }
  return { len: maxLen, str: a.slice(endI - maxLen, endI) };
}

function scoreMatch(dbName, siteName) {
  const fN = norm(dbName), mN = mainNorm(dbName), sN = norm(siteName), smN = mainNorm(siteName);

  // 완전 일치
  if (fN === sN || mN === sN || fN === smN || mN === smN) return { score: 9999, reason: '완전일치' };

  // N호 번호 불일치 → 즉시 거부
  const dbHo = (dbName.match(/(\d+)호/) || [])[1];
  const siteHo = (siteName.match(/(\d+)호/) || [])[1];
  if (dbHo && siteHo && dbHo !== siteHo) return { score: -9999, reason: `N호 불일치(${dbHo}호≠${siteHo}호)` };

  // 포함 관계
  const shorter = fN.length <= sN.length ? fN : sN;
  const longer  = fN.length <= sN.length ? sN : fN;
  if (shorter.length >= 3 && longer.includes(shorter) && !GENERIC.has(shorter))
    return { score: 300 + shorter.length * 15, reason: `포함(${shorter})` };

  // LCS
  const mi = lcsInfo(mN, sN), fi = lcsInfo(fN, sN);
  let score = 0, reason = '';

  if (mi.len >= 3 && !GENERIC.has(mi.str)) {
    const pref = mN.startsWith(mi.str) || sN.startsWith(mi.str);
    const s = mi.len * (pref ? 3 : 2);
    if (s > score) { score = s; reason = `LCS="${mi.str}"(${mi.len}자,${pref?'prefix':'mid'})`; }
  }
  if (fi.len >= 3 && !GENERIC.has(fi.str)) {
    const pref2 = fN.startsWith(fi.str) || sN.startsWith(fi.str);
    const s = fi.len * (pref2 ? 2 : 1);
    if (s > score) { score = s; reason = `LCS="${fi.str}"(${fi.len}자,${pref2?'prefix':'mid'})`; }
  }

  return { score, reason: reason || '없음' };
}

// ── Supabase 업데이트 ────────────────────────────────────────
async function uploadImage(code, imgUrl) {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return imgUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'png').slice(0, 4);
    const fileName = `${code}.${ext}`;
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

// ── 핵심 키워드 정의 ─────────────────────────────────────────
// 제품명에서 고유한 핵심어 추출 (generic 단어 제외)
function extractCoreKeywords(name) {
  const clean = name.replace(/<[^>]*>/g, '').replace(/[()（）\[\]<>]/g, ' ').replace(/[,\/]/g, ' ').trim();
  const tokens = clean.split(/[\s\-_]+/).filter(t => t.length >= 2);
  const nonGeneric = tokens.filter(t => {
    const low = t.toLowerCase();
    return !GENERIC.has(low) && !['신규', '풍농', '함유', '질소', '입상', '입상'].includes(low);
  });

  const keywords = [];
  // 전체 이름 (괄호 제거) 추가
  const baseClean = name.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, '').trim();
  keywords.push(baseClean);

  // 공백 없는 압축 버전
  const compacted = nonGeneric.slice(0, 3).join('');
  if (compacted.length >= 2 && compacted !== baseClean.replace(/\s+/g,'')) keywords.push(compacted);

  // 앞 단어들
  if (nonGeneric.length > 0) keywords.push(nonGeneric[0]);
  if (nonGeneric.length > 1) keywords.push(nonGeneric.slice(0, 2).join(' '));

  return [...new Set(keywords)].filter(k => k.length >= 2);
}

// ── 메인 ────────────────────────────────────────────────────
async function main() {
  const dryRun = process.env.DRY_RUN === '1';
  const THRESHOLD = 12; // 이 점수 이상만 업데이트

  // DB에서 null인 풍농 제품 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const all = await res.json();
  const SKIP_CATS = new Set(['맞춤형', 'BB', '소포장']);
  const targets = all.filter(p =>
    (p.suppliers || []).includes('풍농') &&
    !p.product_url &&
    !SKIP_CATS.has(p.category) &&
    !(p.category === '원예맞춤' && (p.suppliers?.length ?? 0) >= 2)
  );

  console.log(`🔍 재검색 대상: ${targets.length}개 (임계값 score≥${THRESHOLD}${dryRun?' dry-run':''})\n`);

  let success = 0, stillNull = 0;

  for (const p of targets) {
    const keywords = extractCoreKeywords(p.product_name);
    console.log(`\n[${p.product_name}]`);
    console.log(`  키워드: ${keywords.join(' | ')}`);

    // 모든 키워드로 검색 + 결과 합산
    const allResults = new Map();
    for (const kw of keywords) {
      const results = await searchSite(kw);
      results.forEach(r => { if (!allResults.has(r.wrId)) allResults.set(r.wrId, r); });
      if (results.length > 0) {
        console.log(`  "${kw}" → ${results.map(r => r.name).join(', ')}`);
      }
    }

    if (allResults.size === 0) {
      console.log('  → 검색 결과 없음 (null 유지)');
      stillNull++;
      continue;
    }

    // 유사도 계산
    const scored = [...allResults.values()]
      .map(r => {
        const { score, reason } = scoreMatch(p.product_name, r.name);
        return { ...r, score, reason };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      console.log('  → 유사도 0 이하 (null 유지)');
      stillNull++;
      continue;
    }

    // 상위 3개 출력
    console.log('  유사도 상위:');
    scored.slice(0, 3).forEach(r =>
      console.log(`    ${r.score >= THRESHOLD ? '✅' : '❌'} score=${r.score} "${r.name}" (${r.reason}, wr_id=${r.wrId})`)
    );

    const best = scored[0];
    if (best.score < THRESHOLD) {
      console.log(`  → 임계값 미달 (최고 ${best.score} < ${THRESHOLD}) → null 유지`);
      stillNull++;
      continue;
    }

    // 업데이트
    if (!dryRun) {
      const storedImg = best.imgUrl ? await uploadImage(p.product_code, best.imgUrl) : null;
      await updateDB(p.product_code, { img_url: storedImg, product_url: best.productUrl });
      await sleep(300);
    }
    console.log(`  → ✅ "${best.name}" (score=${best.score})${dryRun ? ' [DRY]' : ' 업데이트 완료'}`);
    success++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 업데이트: ${success} | ❌ null 유지: ${stillNull} | 전체: ${targets.length}`);
}

main().catch(console.error);
