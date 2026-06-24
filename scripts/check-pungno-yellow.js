// 🟡 경계 매칭 제품들 실제 사이트 제품명 직접 확인
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
  // div.tit 또는 h2.bo_v_tit 에서 제품명 추출
  const m1 = html.match(/<div\s+class="tit[^"]*"[^>]*>([^<]+)<\/div>/);
  const m2 = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const m3 = html.match(/class="bo_v_tit[^"]*"[^>]*>\s*([^<\n]+)/);
  return (m1?.[1] || m2?.[1] || m3?.[1] || '').replace(/\s+/g, ' ').trim();
}

async function main() {
  // 검증 대상: DB 제품명 ↔ 저장된 wr_id
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code,product_name,product_url&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const all = await res.json();
  const pungno = all.filter(p =>
    p.product_url?.includes('npko.co.kr')
  );

  console.log('풍농 URL 있는 제품:', pungno.length, '개\n');

  // wr_id 중복 체크
  const wrIdGroups = {};
  pungno.forEach(p => {
    const m = p.product_url.match(/wr_id=(\d+)/);
    if (!m) return;
    const wrId = m[1];
    if (!wrIdGroups[wrId]) wrIdGroups[wrId] = [];
    wrIdGroups[wrId].push(p.product_name);
  });

  // 중복 wr_id 출력
  console.log('=== wr_id 중복 매핑 (같은 URL에 여러 DB제품) ===');
  let hasDup = false;
  for (const [wrId, names] of Object.entries(wrIdGroups)) {
    if (names.length > 1) {
      hasDup = true;
      console.log(`  wr_id=${wrId} → ${names.join(' | ')}`);
    }
  }
  if (!hasDup) console.log('  없음 ✅');

  console.log('\n=== 각 wr_id 실제 사이트 제목 확인 ===');
  const uniqueWrIds = Object.keys(wrIdGroups);
  for (const wrId of uniqueWrIds) {
    await sleep(500);
    try {
      const html = await fetchPage(`${FN_BASE}/bbs/board.php?bo_table=s2_1&wr_id=${wrId}`);
      const title = extractTitle(html);
      const dbNames = wrIdGroups[wrId];
      const allMatch = dbNames.every(n => {
        const norm = s => s.toLowerCase().replace(/\s+/g,'').replace(/[()（）\[\]<>]/g,'').replace(/[,\/]/g,'');
        const a = norm(n.replace(/\([^)]*\)/g,''));
        const b = norm(title);
        // LCS
        let maxLen = 0;
        const dp = Array.from({length:a.length+1}, () => new Array(b.length+1).fill(0));
        for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++)
          if(a[i-1]===b[j-1]) { dp[i][j]=dp[i-1][j-1]+1; if(dp[i][j]>maxLen) maxLen=dp[i][j]; }
        return maxLen >= 3;
      });
      const label = allMatch ? '✅' : '🔴';
      if (!allMatch || dbNames.length > 1) {
        console.log(`${label} wr_id=${wrId} 사이트="${title.slice(0,40)}" ← DB: ${dbNames.join(' | ')}`);
      }
    } catch(e) {
      console.log(`  wr_id=${wrId}: 오류 ${e.message}`);
    }
  }
}

main().catch(console.error);
