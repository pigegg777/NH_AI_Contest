const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr/knco';

async function testAjax() {
  console.log('=== product02Ajax.php (전체 목록) ===');
  const body = new URLSearchParams({ pageIndex: '', pageCountSize: '', newType: 'new', nxoInner: 'y' });
  const res = await fetch(`${base}/product02Ajax.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Referer': `${base}/product02New.php?nxoInner=y` },
    body: body.toString(),
  });
  const html = await res.text();
  console.log('status:', res.status, 'len:', html.length);
  const $ = cheerio.load(html);
  const items = $('a:has(img), .list a, li a').filter((_, el) => $(el).text().trim().length > 1);
  console.log('아이템 수:', items.length);
  items.slice(0, 5).each((_, el) => console.log(' -', $(el).text().trim().slice(0, 40), '|', $(el).attr('href')));
  if (html.length < 2000) console.log(html);
}

async function testSearch(term) {
  console.log(`\n=== product02Use.php 검색: "${term}" ===`);
  const url = `${base}/product02Use.php?skskSearch4=${encodeURIComponent(term)}&pageIndex=1&nxoInner=y`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': `${base}/product02New.php?nxoInner=y` }
  });
  const html = await res.text();
  console.log('status:', res.status, 'len:', html.length);
  const $ = cheerio.load(html);
  const items = $('a').filter((_, el) => $(el).text().trim().length > 1 && $(el).attr('href'));
  console.log('링크 수:', items.length);
  items.slice(0, 10).each((_, el) => console.log(' -', $(el).text().trim().slice(0, 40), '|', $(el).attr('href')));
  if (html.length < 3000) console.log('\nHTML:', html.slice(0, 1000));
}

(async () => {
  await testAjax();
  await testSearch('요소');
  await testSearch('단한번');
})().catch(console.error);
