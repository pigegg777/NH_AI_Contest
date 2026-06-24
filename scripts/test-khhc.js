// 협화 사이트 구조 분석
const cheerio = require('cheerio');

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,*/*',
    }
  });
  console.log('HTTP:', res.status, url);
  return res.text();
}

async function main() {
  // 1. 기본 product 페이지
  const html = await fetchHtml('https://www.khhc.co.kr/product');
  const $ = cheerio.load(html);
  console.log('\n=== 기본 페이지 분석 ===');
  console.log('title:', $('title').text());
  console.log('script tags:', $('script[src]').length);
  console.log('React root:', $('#root, #app, [data-reactroot]').length > 0 ? 'YES' : 'NO');

  // 기본 HTML (1500자)
  console.log('\nHTML first 1500:', html.slice(0, 1500));

  // 2. keyword 검색 URL 테스트
  console.log('\n=== 검색 URL 테스트 ===');
  const searchHtml = await fetchHtml('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC');
  const $s = cheerio.load(searchHtml);
  // 제품 리스트 선택자 확인
  console.log('.sc-emMPjM:', $s('.sc-emMPjM').length);
  console.log('.sc-bsDpAt:', $s('.sc-bsDpAt').length);
  console.log('a[href*=product]:', $s('a[href*="product"]').length);
  console.log('\n검색 HTML first 2000:', searchHtml.slice(0, 2000));
}

main().catch(console.error);
