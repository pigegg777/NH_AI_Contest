const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr/knco';

async function main() {
  // 1. Ajax POST 검색 응답 확인
  console.log('=== POST Ajax 검색: 요소 ===');
  const body = new URLSearchParams({
    pageIndex: '1', pageCountSize: '', newType: '',
    skskSearch: '', skskSearch2: '', skskSearch3: '',
    skskSearch4: '요소',
    skskNowPage: 'product02Use.php', nxoInner: 'y'
  });
  const r1 = await fetch(base+'/product02Ajax.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': base+'/product02Use.php?nxoInner=y',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });
  const html1 = await r1.text();
  console.log('HTTP:', r1.status, '| 길이:', html1.length);
  console.log('HTML (첫 500):', html1.slice(0, 500));

  await new Promise(r => setTimeout(r, 1000));

  // 2. GET 방식 검색 시도
  console.log('\n=== GET 방식 검색: 요소 ===');
  const r2 = await fetch(base+'/product02Use.php?skskSearch4=%EC%9A%94%EC%86%8C&pageIndex=1&nxoInner=y', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base+'/product02New.php' }
  });
  const html2 = await r2.text();
  console.log('HTTP:', r2.status, '| 길이:', html2.length);
  const $2 = cheerio.load(html2);
  console.log('링크:', $2('a[href*="product"]').length, '개');
  console.log('HTML (첫 500):', html2.slice(0, 500));

  await new Promise(r => setTimeout(r, 1000));

  // 3. 메인 제품 페이지 직접 접근
  console.log('\n=== 메인 제품 페이지 ===');
  const r3 = await fetch('http://www.chobi.co.kr/product/product_02/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html3 = await r3.text();
  console.log('HTTP:', r3.status, '| 길이:', html3.length);
  const $3 = cheerio.load(html3);
  console.log('#searchItemNm 존재:', $3('#searchItemNm').length);
  console.log('form:', $3('form').length, '개');
  $3('form').each((_,el) => console.log('  form action:', $3(el).attr('action')));
  console.log('HTML (첫 800):', html3.slice(0, 800));

  await new Promise(r => setTimeout(r, 1000));

  // 4. 다른 URL 패턴 시도
  console.log('\n=== 다른 URL 시도 ===');
  const urls = [
    'http://www.chobi.co.kr/',
    'http://www.chobi.co.kr/product/',
    'https://www.chobi.co.kr/',
  ];
  for (const url of urls) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' });
    console.log(url, '→', r.status, r.headers.get('location') || '');
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(console.error);
