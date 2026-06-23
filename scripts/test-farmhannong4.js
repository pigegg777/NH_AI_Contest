const cheerio = require('cheerio');
const { detailMatchesProduct } = require('./retry-farmhannong-lib');

const BASE = 'https://www.farmhannong.com';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) return null;
  return cheerio.load(await res.text());
}

async function searchFarmhannong(term) {
  const url = BASE + '/kor/product/product_ct02/list.do?pageIndex=1&productCt2=&searchType=%EC%A0%84%EC%B2%B4&productCt1=PRODUCT_CT02&productName=' + encodeURIComponent(term);
  const $ = await fetchHtml(url);
  if (!$) return [];
  const items = [];
  $('a[data-seq]').each((_, el) => {
    const seq = $(el).attr('data-seq');
    const name = $(el).find('p.tit span').text().trim() || $(el).find('p.tit').text().trim();
    if (seq && name) items.push({ seq, name });
  });
  return [...new Map(items.map(i => [i.seq, i])).values()];
}

async function getDetail(seq) {
  const url = BASE + '/kor/product/product_ct02/view.do?seq=' + seq;
  const $ = await fetchHtml(url);
  if (!$) return { url, img: null, text: '' };
  const img = $('.swiper-slide img').first().attr('src');
  const pageText = $('body').text().replace(/\s+/g, ' ').trim();
  return { url, img: img ? (img.startsWith('http') ? img : BASE + img) : null, text: pageText };
}

async function main() {
  const testCases = [
    { name: '반포로ok', code: '2100042537910' },
    { name: '뿌리조은', code: '2100042537903' },
    { name: '반포로NK', code: '2100038410647' },
    { name: '입상유안', code: '2100038234540' },
  ];

  for (const tc of testCases) {
    console.log(`\n=== ${tc.name} ===`);
    const items = await searchFarmhannong(tc.name);
    console.log('검색결과:', items);
    if (items.length === 0) { console.log('→ null (검색 실패)'); continue; }

    const best = items[0];
    const detail = await getDetail(best.seq);
    const matched = detailMatchesProduct({ productName: tc.name, foundName: best.name, detailName: null, detailText: detail.text });
    console.log('img:', detail.img);
    console.log('url:', detail.url);
    console.log('검증:', matched);
    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
