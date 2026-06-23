const cheerio = require('cheerio');

async function test(method, term) {
  console.log(`\n=== ${method} "${term}" ===`);
  const body = new URLSearchParams({ search_keyword: term });
  const opts = method === 'POST'
    ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.nousbo.com/product1' }, body: body.toString() }
    : { headers: { 'User-Agent': 'Mozilla/5.0' } };
  const url = method === 'POST' ? 'https://www.nousbo.com/product1' : `https://www.nousbo.com/product1?${body}`;
  const res = await fetch(url, opts);
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = $('.thumbList.xet-row a').filter((_, el) => $(el).text().trim().length > 0);
  console.log('결과 수:', items.length);
  items.slice(0, 5).each((i, el) => console.log(' -', $(el).text().trim().slice(0, 40)));
}

(async () => {
  await test('POST', '유안');
  await test('GET', '유안');
  await test('POST', '요소');
})().catch(console.error);
