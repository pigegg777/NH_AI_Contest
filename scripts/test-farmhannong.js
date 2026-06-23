const cheerio = require('cheerio');
const base = 'https://www.farmhannong.com';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) { console.log('실패:', res.status, url.slice(0,80)); return null; }
  return cheerio.load(await res.text());
}

// data-seq로 상세 URL 패턴 찾기
async function testDetailUrl(seq) {
  const patterns = [
    `/kor/product/product_ct02/view.do?seq=${seq}`,
    `/kor/product/product_ct02/detail.do?seq=${seq}`,
    `/kor/product/product_ct02/list.do?seq=${seq}`,
    `/kor/product/product_ct02/view.do?productSeq=${seq}`,
  ];
  for (const p of patterns) {
    const res = await fetch(`${base}${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log(`status=${res.status} ${p}`);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      // swiper-slide 이미지
      const img = $('.swiper-slide-active img, .swiper-slide.on img, .swiper-slide img').first().attr('src');
      console.log('  이미지:', img || '없음');
      // 모든 img 앞 3개
      $('img').slice(0,3).each((_, el) => console.log('  img:', $(el).attr('src')?.slice(0,80)));
      break;
    }
  }
}

testDetailUrl('5543').catch(console.error);
