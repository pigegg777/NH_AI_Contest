const cheerio = require('cheerio');

// 누보 메인 메뉴에서 제품 카테고리 링크 모두 수집
fetch('https://www.nousbo.com/product1', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  console.log('=== 카테고리/페이지 링크 ===');
  $('a[href*="product"], a[href*="category"], a[href*="page"]').each((i, el) => {
    const href = $(el).attr('href');
    const txt = $(el).text().trim();
    if (href && txt) console.log(txt.slice(0,30), '→', href);
  });

  console.log('\n=== 총 제품 수:', $('.thumbList.xet-row a').filter((_, el) => $(el).text().trim().length > 2).length);
});
