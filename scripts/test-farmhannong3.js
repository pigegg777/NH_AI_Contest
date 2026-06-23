const cheerio = require('cheerio');
const BASE = 'https://www.farmhannong.com';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!res.ok) { console.log('HTTP error:', res.status); return null; }
  return cheerio.load(await res.text());
}

async function getDetail(seq) {
  const url = `${BASE}/kor/product/product_ct02/view.do?seq=${seq}`;
  console.log('Detail URL:', url);
  const $ = await fetchHtml(url);
  if (!$) return null;

  // swiper-slide 이미지
  const swiperImgs = [];
  $('.swiper-slide img').each((_, el) => swiperImgs.push($(el).attr('src')));
  console.log('swiper-slide imgs:', swiperImgs);

  // swiper-slide-active
  const activeImg = $('.swiper-slide-active img').first().attr('src');
  console.log('swiper-slide-active img:', activeImg);

  // 모든 img 태그
  const allImgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('common') && !src.includes('layout') && !src.includes('logo')) {
      allImgs.push(src);
    }
  });
  console.log('All content imgs:', allImgs.slice(0, 5));

  // og:image
  const ogImg = $('meta[property="og:image"]').attr('content');
  console.log('og:image:', ogImg);
}

getDetail(4586).catch(console.error);
