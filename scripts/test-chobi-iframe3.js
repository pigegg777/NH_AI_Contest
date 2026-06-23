const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr';

async function test() {
  const res = await fetch(`${base}/knco/product02New.php?nxoInner=y`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': `${base}/product/product_02/` }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // JS 파일 목록
  console.log('=== script src ===');
  $('script[src]').each((_, el) => console.log($(el).attr('src')));

  // inline script에서 API URL 힌트
  console.log('\n=== inline script 내용 ===');
  $('script:not([src])').each((_, el) => {
    const txt = $(el).html() || '';
    if (txt.length > 10) console.log(txt.slice(0, 600));
  });

  // 전체 HTML
  console.log('\n=== 전체 HTML ===');
  console.log(html);
}

test().catch(console.error);
