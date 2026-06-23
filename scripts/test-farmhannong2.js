const cheerio = require('cheerio');

async function test(term) {
  const url = 'https://www.farmhannong.com/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=' + encodeURIComponent(term);
  console.log('검색URL:', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  console.log('HTTP:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq) items.push({ seq, name });
  });
  console.log('data-seq items:', items);

  const pdList = $('#list02');
  console.log('#list02 exists:', pdList.length);

  const idx = html.indexOf('list02');
  if (idx > 0) {
    console.log('\nHTML excerpt around list02:');
    console.log(html.slice(idx - 50, idx + 800));
  } else {
    console.log('list02 not found. First 500:', html.slice(0, 500));
  }
}

test('반포로ok').catch(console.error);
