const cheerio = require('cheerio');

async function test(term) {
  const base = 'http://www.chobi.co.kr';

  // iframe 페이지 직접 접근
  const url = `${base}/knco/product02New.php?nxoInner=y&searchItemNm=${encodeURIComponent(term)}`;
  console.log('URL:', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'http://www.chobi.co.kr/product/product_02/',
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('status:', res.status, '/ html len:', html.length);

  // 다양한 셀렉터 시도
  const selectors = ['#skskList .list a', '.list a', '.product a', '.item a', 'ul li a', 'a[href*="product"]'];
  for (const sel of selectors) {
    const cnt = $(sel).length;
    if (cnt > 0) {
      console.log(`\n셀렉터 "${sel}": ${cnt}개`);
      $(sel).slice(0, 3).each((i, el) => console.log(' -', $(el).text().trim().slice(0, 50), '|', $(el).attr('href')));
    }
  }

  // 검색 form 확인
  $('form').each((i, el) => console.log(`form[${i}] action="${$(el).attr('action')}" method="${$(el).attr('method')}"`));

  // HTML 앞부분 확인
  console.log('\n--- HTML 앞 500자 ---');
  console.log(html.slice(0, 500));
}

(async () => {
  await test('요소');
})().catch(console.error);
