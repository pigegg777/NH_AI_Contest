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
  const terms = [
    '롱스타', '추비특', '칼슘요소', '원예과수OK', '원예과수', '파워플러스3', '파워원예복합',
    '엔케이31', '21플러스', '하이칼리', '킹콩', '원예밸런스', '뿌리조은황플러스',
    '한번에측조', '엔케이24', '파워왕감자', '고구마마우엉', '입상황산가리', '콩땅콩깨', '보리밀옥수수',
  ];
  for (const t of terms) {
    const results = await searchFarmhannong(t);
    console.log(`"${t}": ${results.length > 0 ? results.slice(0,3).map(r => r.name).join(', ') : '없음'}`);
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
