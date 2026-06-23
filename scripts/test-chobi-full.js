const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr/knco';

async function fetchPage(pageIndex) {
  const body = new URLSearchParams({
    pageIndex: String(pageIndex), pageCountSize: '50', newType: '',
    skskSearch: '', skskSearch2: '', skskSearch3: '', skskSearch4: '',
    skskNowPage: 'product02Use.php', nxoInner: 'y'
  });
  const res = await fetch(`${base}/product02Ajax.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${base}/product02Use.php?nxoInner=y`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="product02View"]').each((_, el) => {
    const name = $(el).find('dd.c1 strong').text().trim() || $(el).find('strong').text().trim();
    const href = $(el).attr('href');
    const imgSrc = $(el).find('span.img img').attr('src') || $(el).find('img').first().attr('src');
    if (name) items.push({ name, href, img: imgSrc || null });
  });

  // 페이지 정보 (총 개수)
  const pageInfo = $('div.paging').text().trim();
  const totalText = html.match(/totalCount['\"]?:\s*['\"]?(\d+)/);
  const total = totalText ? parseInt(totalText[1]) : null;

  return { items, pageInfo, total, htmlLen: html.length };
}

async function main() {
  console.log('=== 페이지 1 (50개) ===');
  const p1 = await fetchPage(1);
  console.log('아이템 수:', p1.items.length, '| HTML 길이:', p1.htmlLen);
  console.log('페이지 정보:', p1.pageInfo.slice(0, 100));

  // 이미지 URL 완전히 가져오기
  console.log('\n첫 5개 제품:');
  p1.items.slice(0, 5).forEach(p => {
    console.log(` "${p.name}" | url: ${p.href?.slice(0,60)} | img: ${p.img?.slice(0,80)}`);
  });

  // img src가 절대 URL인지 확인
  if (p1.items[0]?.img) {
    const testImg = p1.items[0].img;
    console.log('\n이미지 테스트:', testImg);
    const r = await fetch(testImg, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base } });
    console.log('이미지 접근:', r.status, r.ok ? 'OK ✅' : 'FAILED ❌');
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n=== 페이지 2 ===');
  const p2 = await fetchPage(2);
  console.log('아이템 수:', p2.items.length, '| HTML 길이:', p2.htmlLen);

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n=== 페이지 3 ===');
  const p3 = await fetchPage(3);
  console.log('아이템 수:', p3.items.length, '| HTML 길이:', p3.htmlLen);

  // 전체 목록 집계
  const allItems = [...p1.items, ...p2.items, ...p3.items];
  console.log('\n전체 수집 제품 수:', allItems.length);
  console.log('모든 제품명:', allItems.map(p => p.name).join(', '));

  // 조비 DB 제품과 매칭 테스트
  const targets = ['유안', '입상황산가리', '슈퍼듀얼요소', '원예맞춤4호', '원예맞춤6호'];
  console.log('\n=== 조비 미완성 제품 매칭 테스트 ===');
  targets.forEach(t => {
    const match = allItems.find(p => p.name.includes(t) || t.includes(p.name));
    console.log(`"${t}" → ${match ? match.name : '없음'}`);
  });

  // 제품 상세 페이지 테스트
  if (p1.items[0]?.href) {
    console.log('\n=== 상세 페이지 테스트 ===');
    const detailUrl = `${base}/${p1.items[0].href}`;
    const res = await fetch(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const imgs = $('img').map((_, el) => $(el).attr('src')).get().filter(s => s?.includes('files'));
    console.log('상세 이미지:', imgs.slice(0, 3));
    console.log('상세 URL:', detailUrl);
  }
}

main().catch(console.error);
