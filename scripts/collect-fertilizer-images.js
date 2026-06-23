// scripts/collect-fertilizer-images.js
// 공급업체 사이트에서 비료 이미지/상세링크 수집 후 Supabase 업데이트

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const delay = () => sleep(1000 + Math.random() * 1000);

// ── 공급업체 우선순위 ──────────────────────────────────────
// DB supplier 표기 → searcher 키 매핑
const SUPPLIER_ALIAS = { 'KG케미칼': 'KG케미칼' };
const PRIORITY = ['남해화학', '풍농', '조비', '누보', '팜한농', 'KG케미칼', '협화', '차세대케미컬', '천지', '태흥'];
const SKIP_SUPPLIERS = ['세기'];

// ── skip 카테고리 규칙 ─────────────────────────────────────
function shouldSkip(product) {
  const cat = product.sheet_category || '';
  if (['맞춤형', 'bb', 'BB', '소포장'].includes(cat)) return true;
  if (product.category === '원예' && (product.suppliers || []).length >= 2) return true;
  return false;
}

// ── 검색어 4단계 생성 ──────────────────────────────────────
function buildSearchTerms(name) {
  // <업체명> 제거 후 기본 검색어
  const cleanName = name.replace(/<[^>]+>/g, '').trim();
  const terms = [cleanName];
  // 2단계: 괄호 제거
  const noParen = cleanName.replace(/\(.*?\)/g, '').trim();
  if (noParen !== cleanName) terms.push(noParen);
  // 3단계: 괄호 안 내용 (쉼표 전)
  const parenMatch = cleanName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].split(',')[0].trim();
    if (inner) terms.push(inner);
  }
  // 4단계: 앞 3글자, 뒤 3글자
  const base = noParen || cleanName;
  if (base.length > 3) {
    terms.push(base.slice(0, 3));
    terms.push(base.slice(-3));
  }
  return [...new Set(terms)];
}

// ── 유사도 점수 (포함 여부 우선, 다음 Levenshtein) ────────
function similarity(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a.includes(b) || b.includes(a)) return 1000;
  let dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return -dp[a.length][b.length];
}

// ── HTTP GET (cheerio 파싱) ────────────────────────────────
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

// ── 공급업체별 검색 함수 ───────────────────────────────────
const SEARCHERS = {
  남해화학: async (term) => {
    const base = 'https://www.nhchem.co.kr';
    const url = `${base}/sub/product/fertilizer/list.html?search_txt=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('a:has(.thum_wrap)').map((_, el) => ({
      name: $(el).find('strong').text().trim(),
      url: new URL($(el).attr('href'), base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get();
  },

  풍농: async (term) => {
    const base = 'https://www.npko.co.kr';
    const url = `${base}/bbs/board.php?bo_table=s2_1&ca1=10&stx=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('a:has(.thumb)').map((_, el) => ({
      name: $(el).find('.tit').text().trim(),
      url: $(el).attr('href'),
      img: $(el).find('img.bd_img').attr('src') || null,
    })).get();
  },

  조비: async (term) => {
    const base = 'http://www.chobi.co.kr';
    const url = `${base}/product/product_02/?searchItemNm=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('#skskList .list a').map((_, el) => ({
      name: $(el).text().trim(),
      url: new URL($(el).attr('href'), base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get();
  },

  누보: async (term) => {
    const base = 'https://www.nousbo.com';
    const url = `${base}/product1?search_keyword=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('.thumbList.xet-row a').map((_, el) => ({
      name: $(el).text().trim(),
      url: new URL($(el).attr('href'), base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get();
  },

  팜한농: async (term) => {
    const base = 'https://www.farmhannong.com';
    const url = `${base}/kor/product/product_ct02/list.do?productName=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('#list02 a').map((_, el) => ({
      name: $(el).text().trim(),
      url: new URL($(el).attr('href'), base).href,
      img: $(el).find('img').attr('src')
        ? new URL($(el).find('img').attr('src'), base).href : null,
    })).get();
  },

  // KG케미칼: 검색(POST) 대신 카테고리 전체 순회 후 제품명으로 유사도 매칭
  // 이 함수는 term을 무시하고 전체 제품 목록을 반환 → 호출 측에서 유사도 선택
  // 실제 KG 수집은 scripts/collect-kg-fertilizer.js 전용 스크립트 사용 권장
  'KG케미칼': async (_term) => {
    const http = require('http');
    const iconv = require('iconv-lite');
    const cats = ['001101', '000401', '000201', '001001', '000301', '000701', '000101', '000901'];
    const base = 'http://www.kgchem.co.kr';
    const results = [];
    for (const cat of cats) {
      try {
        const html = await new Promise((resolve, reject) => {
          const req = http.request({
            hostname: 'www.kgchem.co.kr',
            path: `/renew/product/product.php?category=${cat}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }
          }, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(iconv.decode(Buffer.concat(chunks), 'euc-kr')));
          });
          req.on('error', reject);
          req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
          req.end();
        });
        const re = /<li><a href="(product_view\.php\?[^"]+)"><div class="thum"><img src="([^"]+)"[^>]*><\/div><p>([^<]+)<\/p><\/a><\/li>/g;
        let m;
        while ((m = re.exec(html)) !== null) {
          const name = m[3].trim();
          if (name.includes('영상자료') || name.includes('농가사례')) continue;
          const imgSrc = m[2];
          results.push({
            name,
            url: `${base}/renew/product/${m[1]}`,
            img: imgSrc.includes('noimg') ? null
              : imgSrc.startsWith('http') ? imgSrc : `${base}/renew/${imgSrc.replace(/^\.\.\//, '')}`,
          });
        }
      } catch { /* 카테고리 오류 무시 */ }
    }
    return results;
  },

  협화: async (term) => {
    // React 렌더링 사이트 → fetch 시 빈 결과 가능성 높음
    const $ = await fetchHtml(`https://www.khhc.co.kr/product?q=${encodeURIComponent(term)}`);
    if (!$) return [];
    return $('.sc-emMPjM a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href'),
      img: $(el).find('img').attr('src') || null,
    })).get();
  },

  차세대케미컬: async (term) => {
    const url = `https://ngchasedai.com/WEB_KR/bbs/SearchList.asp?menu=0&code=03_01&SearchWord=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('.wrap_btn_layout a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href'),
      img: $(el).find('img').attr('src') || null,
    })).get();
  },

  천지: async (term) => {
    const url = `https://cheonjibio.com/bbs/board.php?bo_table=product_01&sop=and&sfl=wr_subject&stx=${encodeURIComponent(term)}`;
    const $ = await fetchHtml(url);
    if (!$) return [];
    return $('ul.bo_list li a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href'),
      img: $(el).find('img').attr('src') || null,
    })).get();
  },

  태흥: async (_term) => {
    // 카테고리 페이지 직접 접근 후 전체 수집 (term으로 유사도 매칭)
    const $ = await fetchHtml('https://www.treefertilizer.com/%EC%9B%90%EC%98%88%EC%9A%A9%EB%B9%84%EB%A3%8C');
    if (!$) return [];
    return $('#comp-kigmsvbw2 .Exmq9 a').map((_, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr('href'),
      img: $(el).find('img').attr('src') || null,
    })).get();
  },
};

// ── 한 제품에 대해 검색 실행 ───────────────────────────────
async function searchProduct(product, supplier) {
  const fn = SEARCHERS[supplier];
  if (!fn) return null;
  const terms = buildSearchTerms(product.product_name);
  for (const term of terms) {
    await delay();
    let results;
    try { results = await fn(term); } catch { results = []; }
    if (!results || results.length === 0) continue;
    // 유사도 매칭
    const scored = results
      .filter(r => r.name)
      .map(r => ({ ...r, score: similarity(r.name, product.product_name) }))
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0 && scored[0].score > -10) return scored[0];
  }
  return null;
}

// ── Supabase Storage 이미지 업로드 ────────────────────────
async function uploadImage(product_code, imgUrl) {
  let res;
  try { res = await fetch(imgUrl); } catch { return null; }
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = imgUrl.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const fileName = `${product_code}.${ext}`;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/fertilizer-images/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': `image/${ext}`,
        'x-upsert': 'true',
      },
      body: buf,
    }
  );
  if (!uploadRes.ok) {
    console.log(`  ⚠️  Storage 업로드 실패: ${await uploadRes.text()}`);
    return imgUrl; // Storage 실패 시 원본 URL 유지
  }
  return `${SUPABASE_URL}/storage/v1/object/public/fertilizer-images/${fileName}`;
}

// ── Supabase DB 업데이트 ───────────────────────────────────
async function updateDB(product_code, img_url, product_url) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${product_code}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ img_url, product_url }),
    }
  );
  return res.ok;
}

// ── 공급업체 우선순위 정렬 ─────────────────────────────────
function sortedSuppliers(suppliers) {
  const filtered = (suppliers || []).filter(s => !SKIP_SUPPLIERS.includes(s));
  return [
    ...PRIORITY.filter(p => filtered.includes(p)),
    ...filtered.filter(s => !PRIORITY.includes(s)),
  ];
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  // 1. Supabase 전체 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers?select=*&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  const products = await res.json();
  console.log(`📦 총 ${products.length}개 처리 시작\n`);

  let success = 0, skipped = 0, failed = 0;
  const log = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${p.product_name} `);

    // skip 판단
    if (shouldSkip(p)) {
      console.log('→ skip (카테고리 규칙)');
      skipped++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'skip' });
      continue;
    }

    const suppliers = sortedSuppliers(p.suppliers);
    if (suppliers.length === 0) {
      console.log('→ skip (세기만 존재)');
      skipped++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'skip(세기)' });
      continue;
    }

    let found = null;
    let usedSupplier = null;
    for (const supplier of suppliers) {
      found = await searchProduct(p, supplier);
      if (found) { usedSupplier = supplier; break; }
    }

    if (!found) {
      console.log('→ null (검색 실패)');
      failed++;
      log.push({ product_code: p.product_code, product_name: p.product_name, status: 'null' });
      continue;
    }

    // 이미지 Storage 업로드
    let storedImgUrl = null;
    if (found.img) storedImgUrl = await uploadImage(p.product_code, found.img);

    await updateDB(p.product_code, storedImgUrl, found.url);
    console.log(`→ ✅ ${usedSupplier}`);
    success++;
    log.push({ product_code: p.product_code, product_name: p.product_name, status: 'ok', supplier: usedSupplier });
  }

  // 결과 저장
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'collect-result.json'),
    JSON.stringify(log, null, 2)
  );

  console.log(`\n🎉 완료: 성공 ${success} / skip ${skipped} / null ${failed} / 전체 ${products.length}`);
  console.log('📄 상세 결과: data/collect-result.json');
}

main().catch(console.error);
