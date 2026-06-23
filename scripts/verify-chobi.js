// scripts/verify-chobi.js
// 조비 DB 저장 데이터와 사이트 제품명 교차검증
// product_url의 skskIdx로 사이트 제품명 확인 → DB 제품명과 유사도 재계산

const cheerio = require('cheerio');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BASE = 'http://www.chobi.co.kr/knco';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── 유사도 ──────────────────────────────────────────────
function normalizeForMatch(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function similarity(a, b) {
  const na = normalizeForMatch(a), nb = normalizeForMatch(b);
  if (!na || !nb) return -9999;
  if (na === nb) return 2000;
  if (na.includes(nb) || nb.includes(na)) return 1000;
  const m = na.length, n = nb.length;
  const dp = Array.from({ length: m+1 }, (_, i) =>
    Array.from({ length: n+1 }, (_, j) => i===0 ? j : j===0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = na[i-1]===nb[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return -dp[m][n];
}

// ── 조비 전체 목록 ───────────────────────────────────────
async function fetchAllChobi() {
  const all = [];
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
      const idxMatch = href?.match(/skskIdx=(\d+)/);
      if (name && idxMatch) items.push({ name, skskIdx: idxMatch[1], href });
    });
    if (items.length === 0) break;
    all.push(...items);
    await sleep(500);
  }
  return [...new Map(all.map(i => [i.skskIdx, i])).values()];
}

// ── 메인 ────────────────────────────────────────────────
async function main() {
  // 1. DB에서 조비 + 채워진 제품 조회
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,category,suppliers,img_url,product_url&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const all = await res.json();
  const chobi = all.filter(p =>
    p.suppliers && JSON.stringify(p.suppliers).includes('조비') && p.product_url
  );
  console.log(`조비 product_url 있는 제품: ${chobi.length}개\n`);

  // 2. 조비 사이트 전체 목록 로딩
  console.log('조비 사이트 전체 목록 로딩...');
  const siteAll = await fetchAllChobi();
  console.log(`사이트 제품: ${siteAll.length}개\n`);

  // idx → name 맵 생성
  const idxMap = new Map(siteAll.map(p => [p.skskIdx, p.name]));

  // 3. 각 DB 제품 검증
  let ok = 0, mismatch = 0, unknown = 0;
  const mismatches = [];

  for (const p of chobi) {
    const idxMatch = p.product_url?.match(/skskIdx=(\d+)/);
    if (!idxMatch) {
      console.log(`⚠️  URL에 skskIdx 없음: ${p.product_name} → ${p.product_url}`);
      unknown++;
      continue;
    }
    const idx = idxMatch[1];
    const siteName = idxMap.get(idx);

    if (!siteName) {
      // 사이트 목록에는 없지만 URL은 있음 (단종 등)
      console.log(`❓ 사이트 목록 미확인 (idx=${idx}): ${p.product_name}`);
      unknown++;
      continue;
    }

    const score = similarity(siteName, p.product_name);
    const normA = normalizeForMatch(siteName);
    const normB = normalizeForMatch(p.product_name);
    const label = score >= 1000 ? '✅' : score >= -1 ? '🟡' : '❌';

    if (score < -1) {
      mismatch++;
      mismatches.push({ dbName: p.product_name, siteName, score, idx });
      console.log(`${label} [${p.product_code}] DB="${p.product_name}" ↔ 사이트="${siteName}" (score=${score})`);
      console.log(`   normalized: "${normB}" ↔ "${normA}"`);
    } else {
      ok++;
      if (score < 2000) {  // 완전 일치가 아닌 경우 출력
        console.log(`${label} [${p.product_code}] DB="${p.product_name}" ↔ 사이트="${siteName}" (score=${score})`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 정확 매칭: ${ok}개`);
  console.log(`❌ 불일치:   ${mismatch}개`);
  console.log(`❓ 미확인:    ${unknown}개`);

  if (mismatches.length > 0) {
    console.log('\n🔴 불일치 목록:');
    mismatches.forEach(m => {
      console.log(`  DB="${m.dbName}" → 사이트="${m.siteName}" (idx=${m.idx}, score=${m.score})`);
    });
  }

  // 4. 빈 img_url 제품도 확인
  const noImg = chobi.filter(p => !p.img_url);
  if (noImg.length > 0) {
    console.log(`\n⚠️  product_url은 있지만 img_url 없는 제품: ${noImg.length}개`);
    noImg.forEach(p => console.log(`  ${p.product_name}`));
  }
}

main().catch(console.error);
