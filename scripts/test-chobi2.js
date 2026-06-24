const cheerio = require('cheerio');

// 조비 페이지 소스에서 AJAX URL 힌트 찾기
fetch('http://www.chobi.co.kr/product/product_02/', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => r.text()).then(html => {
  // script 태그에서 ajax/fetch/api 패턴 찾기
  const ajaxMatches = html.match(/(ajax|fetch|\.php|api)[^"'\n]{0,80}/gi) || [];
  console.log('=== AJAX 힌트 ===');
  ajaxMatches.slice(0, 10).forEach(m => console.log(m.trim()));

  // 전체 script 태그 내용
  const $ = cheerio.load(html);
  console.log('\n=== script 태그 수:', $('script').length);
  $('script').each((i, el) => {
    const src = $(el).attr('src') || '';
    const txt = $(el).html() || '';
    if (txt.includes('search') || txt.includes('product') || src.includes('product')) {
      console.log(`script[${i}] src=${src} len=${txt.length}`);
      if (txt.length < 500) console.log(txt.slice(0, 300));
    }
  });
});
