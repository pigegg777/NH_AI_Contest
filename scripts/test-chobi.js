const cheerio = require('cheerio');
const body = new URLSearchParams({ searchItemNm: '유안' });
fetch('http://www.chobi.co.kr/product/product_02/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
  body: body.toString()
}).then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  const items = $('#skskList .list a');
  console.log('결과 수:', items.length);
  items.each((i, el) => console.log(i, $(el).text().trim().slice(0, 50)));
  if (items.length === 0) {
    // 다른 셀렉터 시도
    console.log('\n--- 전체 a태그 샘플 ---');
    $('a').slice(0, 10).each((i, el) => console.log($(el).text().trim().slice(0, 40), '|', $(el).attr('href')));
  }
}).catch(e => console.error(e));
