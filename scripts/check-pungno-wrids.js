// 풍농 wr_id별 실제 사이트 제품명 vs DB 제품명 비교
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const FN_BASE = 'https://www.npko.co.kr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,*/*' }
    }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).setTimeout(12000, function () { this.destroy(); reject(new Error('timeout')); }).end();
  });
}

function extractTitle(html) {
  // <title>제품명 > 제품소개 | 풍농</title> 패턴
  const titleM = html.match(/<title>([^<>|]+?)(?:\s*[>|]|\s*$)/);
  if (titleM && titleM[1].trim() !== '(주)풍농') return titleM[1].trim();
  return '';
}

function lcs(a, b) {
  let maxLen = 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; if (dp[i][j] > maxLen) maxLen = dp[i][j]; }
  return maxLen;
}
const norm = s => s.toLowerCase().replace(/\s+/g, '').replace(/[()（）\[\]<>]/g, '').replace(/[,\/]/g, '');
const mainNorm = s => norm(s.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, ''));

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL, SUPABASE_KEY = process.env.SUPABASE_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,category,suppliers,img_url,product_url&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const all = await res.json();
  const pungno = all.filter(p => (p.suppliers || []).includes('풍농') && p.product_url?.includes('npko.co.kr'));

  // wr_id별 그룹화
  const groups = {};
  pungno.forEach(p => {
    const m = p.product_url.match(/wr_id=(\d+)/);
    if (!m) return;
    if (!groups[m[1]]) groups[m[1]] = [];
    groups[m[1]].push(p);
  });

  console.log(`검사 대상 wr_id: ${Object.keys(groups).length}개 (제품 ${pungno.length}개)\n`);

  let ok = 0, warn = 0, bad = 0;
  const badList = [];

  for (const [wrId, prods] of Object.entries(groups)) {
    await sleep(500);
    let siteTitle = '';
    try {
      const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`);
      siteTitle = extractTitle(html);
    } catch (e) { siteTitle = '(오류)'; }

    const sNorm = norm(siteTitle);

    for (const p of prods) {
      const mNorm_ = mainNorm(p.product_name);
      const fNorm_ = norm(p.product_name);
      const lcsScore = Math.max(lcs(mNorm_, sNorm), lcs(fNorm_, sNorm));
      const isExact = sNorm === mNorm_ || sNorm === fNorm_ || sNorm.includes(mNorm_) || mNorm_.includes(sNorm);

      if (isExact || lcsScore >= 3) {
        ok++;
        if (!isExact) {
          console.log(`🟡 [${p.product_name}] ↔ 사이트="${siteTitle}" (lcs=${lcsScore}, wr_id=${wrId})`);
          warn++;
        }
      } else {
        bad++;
        badList.push({ code: p.product_code, dbName: p.product_name, siteName: siteTitle, wrId });
        console.log(`❌ [${p.product_name}] ↔ 사이트="${siteTitle}" (lcs=${lcsScore}, wr_id=${wrId})`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 정확:${ok-warn} | 🟡 근접:${warn} | ❌ 불일치:${bad}`);

  if (badList.length > 0) {
    console.log('\n🔴 불일치 → null 처리 필요:');
    badList.forEach(b => console.log(`  [${b.code}] "${b.dbName}" ↔ "${b.siteName}" (wr_id=${b.wrId})`));
    // null 처리
    for (const b of badList) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${b.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ img_url: null, product_url: null }),
      });
      console.log(`  null 처리: ${r.ok ? '✅' : '❌'} ${b.dbName}`);
      await sleep(200);
    }
  } else {
    console.log('\n불일치 없음 ✅');
  }
}

main().catch(console.error);
