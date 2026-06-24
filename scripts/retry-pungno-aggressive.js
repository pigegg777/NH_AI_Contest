// scripts/retry-pungno-aggressive.js
// 더 짧은 키워드 + 전체 카탈로그 LCS 매칭으로 재시도

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FN_BASE = 'https://www.npko.co.kr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,*/*' }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve(Buffer.concat(c).toString('utf8')));
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

// 전체 카탈로그 수집
async function fetchFullCatalog() {
  const catalog = new Map();
  // 카테고리 전체
  for (const ca of [10, 20, 30, 40, 50]) {
    await sleep(600);
    const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&ca1=${ca}`).catch(() => '');
    parseProducts(html).forEach(p => { if (!catalog.has(p.wrId)) catalog.set(p.wrId, p); });
  }
  // 추가 검색어 (공격적)
  const terms = ['요소', '칼리', '황산가리', '질산', '추비', '쌀', '원예맞춤', '왕왕', '엔케이', '고형', '조사료', '염화', '슈퍼', '가루', '피드'];
  for (const t of terms) {
    await sleep(400);
    const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=${encodeURIComponent(t)}`).catch(() => '');
    parseProducts(html).forEach(p => { if (!catalog.has(p.wrId)) catalog.set(p.wrId, p); });
  }
  return [...catalog.values()];
}

// ── 유사도 ───────────────────────────────────────────────────
const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>\-_]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));
const GENERIC = new Set(['플러스', '비료', '특호', '원예', '복합', '완효성', '황산', '추비', '웃거름', '전용', '골드', '입상', '신규']);

function lcsLength(a, b) {
  let max = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i-1] === b[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; if (dp[i][j] > max) max = dp[i][j]; }
  return max;
}

function lcsStr(a, b) {
  let max = 0, endI = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i-1] === b[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; if (dp[i][j] > max) { max = dp[i][j]; endI = i; } }
  return a.slice(endI - max, endI);
}

function scoreMatch(dbName, siteName) {
  const fN = norm(dbName), mN = mainNorm(dbName), sN = norm(siteName);

  // 완전일치
  if (fN === sN || mN === sN) return { score: 9999, reason: '완전일치' };

  // N호 불일치 → 거부
  const dbHo = (dbName.match(/(\d+)호/) || [])[1];
  const sHo = (siteName.match(/(\d+)호/) || [])[1];
  if (dbHo && sHo && dbHo !== sHo) return { score: -9999, reason: `N호불일치` };

  // 포함관계 (3자 이상, non-generic)
  const shorter = fN.length <= sN.length ? fN : sN;
  const longer = fN.length <= sN.length ? sN : fN;
  if (shorter.length >= 3 && longer.includes(shorter) && !GENERIC.has(shorter))
    return { score: 300 + shorter.length * 15, reason: `포함(${shorter})` };

  // mainNorm 포함관계
  if (mN.length >= 3 && sN.includes(mN) && !GENERIC.has(mN))
    return { score: 300 + mN.length * 12, reason: `mainNorm포함(${mN})` };
  if (mN.length >= 3 && mN.includes(sN) && !GENERIC.has(sN) && sN.length >= 3)
    return { score: 300 + sN.length * 12, reason: `사이트포함(${sN})` };

  // LCS
  const lcsMStr = lcsStr(mN, sN);
  const lcsFStr = lcsStr(fN, sN);
  let best = { score: 0, reason: '' };

  if (lcsMStr.length >= 3 && !GENERIC.has(lcsMStr)) {
    const pref = mN.startsWith(lcsMStr) || sN.startsWith(lcsMStr);
    const s = lcsMStr.length * (pref ? 3 : 2);
    if (s > best.score) best = { score: s, reason: `LCS="${lcsMStr}"(${lcsMStr.length},${pref?'P':'M'})` };
  }
  if (lcsFStr.length >= 3 && !GENERIC.has(lcsFStr)) {
    const pref = fN.startsWith(lcsFStr) || sN.startsWith(lcsFStr);
    const s = lcsFStr.length * (pref ? 2 : 1);
    if (s > best.score) best = { score: s, reason: `LCS="${lcsFStr}"(${lcsFStr.length},${pref?'P':'M'})` };
  }

  return best;
}

async function uploadImage(code, imgUrl) {
  try {
    const r = await fetch(imgUrl);
    if (!r.ok) return imgUrl;
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = (imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'png').slice(0, 4);
    const fn = `${code}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fn}`, {
      method: 'POST', headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': `image/${ext}`, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) return imgUrl;
    return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fn}`;
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

async function main() {
  const dryRun = process.env.DRY_RUN === '1';
  const THRESHOLD = parseInt(process.env.THRESHOLD || '12');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const all = await res.json();
  const SKIP = new Set(['맞춤형', 'BB', '소포장']);
  const targets = all.filter(p =>
    (p.suppliers || []).includes('풍농') && !p.product_url &&
    !SKIP.has(p.category) && !(p.category === '원예맞춤' && (p.suppliers?.length ?? 0) >= 2)
  );

  console.log(`🔍 대상: ${targets.length}개 | 카탈로그 수집 중...\n`);
  const catalog = await fetchFullCatalog();
  console.log(`카탈로그 ${catalog.length}개 확보\n${'='.repeat(60)}`);

  let success = 0, fail = 0;

  for (const p of targets) {
    // 전체 카탈로그에서 유사도 계산
    const scored = catalog
      .map(c => { const r = scoreMatch(p.product_name, c.name); return { ...c, score: r.score, reason: r.reason }; })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const label = best && best.score >= THRESHOLD ? '✅' : '❌';

    console.log(`${label} [${p.product_name}]`);
    if (scored.length > 0) {
      scored.slice(0, 3).forEach(c =>
        console.log(`   score=${c.score} "${c.name}" (${c.reason})`));
    } else {
      console.log('   매칭 없음');
    }

    if (!best || best.score < THRESHOLD) { fail++; continue; }

    if (!dryRun) {
      const img = best.imgUrl ? await uploadImage(p.product_code, best.imgUrl) : null;
      await updateDB(p.product_code, { img_url: img, product_url: best.productUrl });
      await sleep(300);
    }
    console.log(`   → "${best.name}" 업데이트 완료 (score=${best.score})${dryRun?'[DRY]':''}`);
    success++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ 업데이트: ${success} | ❌ null 유지: ${fail}`);
}

main().catch(console.error);
