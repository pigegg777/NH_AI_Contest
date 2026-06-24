const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr/knco';

async function fetchHtml(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html,*/*',
      ...opts.headers,
    },
    ...opts,
  });
  console.log('HTTP:', res.status, url.slice(0, 100));
  return res.text();
}

async function main() {
  // 1. iframe 내용 확인
  console.log('=== iframe 내용: product02New.php ===');
  const html1 = await fetchHtml(`${base}/product02New.php?nxoInner=y`);
  const $1 = cheerio.load(html1);
  console.log('길이:', html1.length);
  console.log('링크 수:', $1('a').length);
  console.log('제품 링크:', $1('a[href*="product02View"]').length);
  console.log('form:', $1('form').length);
  $1('form').each((_, el) => console.log('  form action:', $1(el).attr('action')));
  console.log('HTML (첫 800):', html1.slice(0, 800));

  await new Promise(r => setTimeout(r, 1000));

  // 2. 전체 목록 (newType=new)
  console.log('\n=== iframe: product02Ajax.php 전체 (newType=new) ===');
  const body1 = new URLSearchParams({ pageIndex: '1', pageCountSize: '20', newType: 'new', nxoInner: 'y' });
  const r2 = await fetch(`${base}/product02Ajax.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${base}/product02New.php?nxoInner=y`,
    },
    body: body1.toString(),
  });
  const html2 = await r2.text();
  const $2 = cheerio.load(html2);
  console.log('길이:', html2.length, '| 제품링크:', $2('a[href*="product02View"]').length);
  $2('a[href*="product02View"]').slice(0, 5).each((_, el) => {
    const name = $2(el).find('dd.c1 strong, .name, strong').text().trim();
    const href = $2(el).attr('href');
    console.log(' ', name, '|', href?.slice(0, 80));
  });
  if (html2.length < 2000) console.log('HTML:', html2.slice(0, 800));

  await new Promise(r => setTimeout(r, 1000));

  // 3. 검색어 없이 전체 목록
  console.log('\n=== Ajax 전체 목록 (검색어 없음) ===');
  const body2 = new URLSearchParams({
    pageIndex: '1', pageCountSize: '50', newType: '',
    skskSearch: '', skskSearch2: '', skskSearch3: '', skskSearch4: '',
    skskNowPage: 'product02Use.php', nxoInner: 'y'
  });
  const r3 = await fetch(`${base}/product02Ajax.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${base}/product02Use.php?nxoInner=y`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body2.toString(),
  });
  const html3 = await r3.text();
  const $3 = cheerio.load(html3);
  console.log('길이:', html3.length, '| 제품링크:', $3('a[href*="product02View"]').length);
  $3('a[href*="product02View"]').slice(0, 10).each((_, el) => {
    const name = $3(el).find('dd.c1 strong, strong, .name').text().trim().split('\n')[0];
    const href = $3(el).attr('href');
    const img = $3(el).find('img').attr('src') || '';
    console.log(' ', JSON.stringify(name), '|', href?.slice(0, 60), '| img:', img?.slice(0, 50));
  });
  if (html3.length < 3000) console.log('HTML:', html3.slice(0, 1000));

  await new Promise(r => setTimeout(r, 1000));

  // 4. product02Use.php GET 검색
  console.log('\n=== GET 검색: product02Use.php ===');
  const r4 = await fetchHtml(`${base}/product02Use.php?skskSearch4=%EC%9A%94%EC%86%8C&nxoInner=y`, {
    headers: { 'Referer': `${base}/product02New.php?nxoInner=y` }
  });
  const $4 = cheerio.load(r4);
  console.log('길이:', r4.length, '| 제품링크:', $4('a[href*="product02View"]').length);
  console.log('HTML (첫 500):', r4.slice(0, 500));
}

main().catch(console.error);
