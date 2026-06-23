const cheerio = require('cheerio');
fetch('https://www.nousbo.com/product1?search_keyword=%EC%9C%A0%EC%95%88', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  const items = $('.thumbList.xet-row a');
  console.log('누보 결과 수:', items.length);
  items.each((i, el) => console.log(i, $(el).text().trim().slice(0, 50)));
  if (items.length === 0) {
    console.log('\n--- 다른 셀렉터 시도 ---');
    ['.product-list a', '.item a', '.list a', 'ul li a'].forEach(sel => {
      const cnt = $(sel).length;
      if (cnt > 0) console.log(sel, ':', cnt, '개', $(sel).first().text().trim().slice(0,30));
    });
  }
}).catch(e => console.error(e));
