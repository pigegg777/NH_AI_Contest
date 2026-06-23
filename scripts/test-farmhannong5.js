const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';

async function searchFarmhannong(term) {
  const url = BASE + '/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=' + encodeURIComponent(term);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq && name) items.push({ seq, name });
  });
  return [...new Map(items.map(i => [i.seq, i])).values()];
}

async function main() {
  const terms = ['원예맞춤', '원예맞춤6호', '원예맞춤1호', '파워성장엔', '엔케이804', '반포로32', '롱스타골드', '추비특호'];
  for (const t of terms) {
    const results = await searchFarmhannong(t);
    console.log(`"${t}": ${results.length > 0 ? results.map(r => r.name).join(', ') : '없음'}`);
    await new Promise(r => setTimeout(r, 1200));
  }
}

main().catch(console.error);
