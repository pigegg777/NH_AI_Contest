const cheerio = require('cheerio');

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    }
  });
  console.log('HTTP:', res.status, url.slice(0, 80));
  return res.text();
}

async function main() {
  // 1. 제품 목록 페이지 분석
  const html = await fetchHtml('http://www.chobi.co.kr/product/product_02/');
  const $ = cheerio.load(html);

  console.log('\n=== 페이지 기본 구조 ===');
  console.log('title:', $('title').text().slice(0, 80));

  // KBoard 관련 요소
  console.log('kboard 요소:', $('[class*="kboard"]').length);
  console.log('제품 링크:', $('a[href*="product_02"]').length);

  // 제품 목록 패턴 찾기
  const prodLinks = $('a').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return href.includes('uid=') || href.includes('product_02') || href.includes('board_id=');
  });
  console.log('uid/board 링크:', prodLinks.length);
  prodLinks.slice(0, 5).each((_, el) => {
    console.log(' ', $(el).attr('href')?.slice(0, 100), '|', $(el).text().trim().slice(0, 30));
  });

  // 이미지 링크
  const imgs = $('img[src*="chobi"]').length || $('img').length;
  console.log('이미지 수:', imgs);

  // 페이지 구조 요약
  console.log('\n=== 주요 링크 패턴 ===');
  const allLinks = new Set();
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('chobi') || href.includes('product')) allLinks.add(href.slice(0, 100));
  });
  [...allLinks].slice(0, 15).forEach(l => console.log(' ', l));

  // 2. URL 패턴 탐색
  console.log('\n=== 제품 페이지 다른 경로 ===');
  const paths = [
    'http://www.chobi.co.kr/product/',
    'http://www.chobi.co.kr/?s=%EC%9A%94%EC%86%8C',  // 검색
    'http://www.chobi.co.kr/product/product_02/?skskSearch=%EC%9A%94%EC%86%8C',
    'http://www.chobi.co.kr/product/product_02/?kboard_search=%EC%9A%94%EC%86%8C',
  ];
  for (const url of paths) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const h = await r.text();
    const $p = cheerio.load(h);
    const prodCount = $p('a[href*="uid"]').length || $p('[class*="product"]').length;
    console.log(url.slice(30), '→', r.status, '| 길이:', h.length, '| 제품링크:', prodCount);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 3. 실제 HTML 내 제품 관련 부분 추출
  console.log('\n=== HTML에서 "비료" 또는 "요소" 검색 ===');
  const uidIdx = html.indexOf('uid=');
  if (uidIdx > 0) {
    console.log('uid 패턴 주변 HTML:', html.slice(uidIdx - 100, uidIdx + 300));
  }
  const productIdx = html.indexOf('product_02');
  if (productIdx > 0) {
    console.log('\nproduct_02 주변:', html.slice(productIdx - 50, productIdx + 300));
  }
}

main().catch(console.error);
