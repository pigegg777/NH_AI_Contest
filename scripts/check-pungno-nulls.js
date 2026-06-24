// null 풍농 제품에 대해 추가 검색어로 카탈로그 탐색
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

async function main() {
  // null 제품 목록
  const nullTargets = [
    '왕왕질산', '원예맞춤1호', '가루쌀', '쌀플러스', '엔케이탑', '원예웃거름골드',
    '염화칼륨', '질산추비', '입상황산가리', '슈퍼-40', '슈퍼40', '조사료',
    '프릴요소', '프릴', '고형비료', '21-17', '17-17'
  ];

  const found = new Map();
  for (const term of nullTargets) {
    await sleep(400);
    try {
      const url = `${FN_BASE}/bbs/board.php?bo_table=s2_1&sfl=wr_subject%7C%7Cwr_content&sop=and&stx=${encodeURIComponent(term)}`;
      const html = await fetchPage(url);
      const products = parseProducts(html);
      products.forEach(p => { if (!found.has(p.wrId)) found.set(p.wrId, p); });
      if (products.length > 0) console.log(`"${term}": ${products.map(p => `${p.name}(wr_id=${p.wrId})`).join(', ')}`);
      else console.log(`"${term}": 없음`);
    } catch(e) { console.log(`"${term}": 오류 ${e.message}`); }
  }

  console.log('\n추가 발견된 전체 제품:');
  [...found.values()].forEach(p => console.log(` wr_id=${p.wrId}: ${p.name}`));
  console.log('총:', found.size, '개');
}

main().catch(console.error);
