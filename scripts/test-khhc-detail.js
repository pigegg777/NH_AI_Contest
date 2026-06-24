// 협화 사이트 제품 목록 + 상세 구조 분석
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== 검색: 땅심 ===');
  await page.goto('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // 제품 링크 찾기
  const links = await page.locator('a[href*="/product/"]').all();
  console.log('제품 링크 수:', links.length);
  for (const link of links.slice(0, 5)) {
    const href = await link.getAttribute('href');
    const text = await link.innerText().catch(() => '');
    console.log('  href:', href, '| text:', text.slice(0, 50).replace(/\n/g, ' '));
  }

  // 전체 a 태그 href 확인
  const allLinks = await page.locator('a').all();
  console.log('\n전체 링크 수:', allLinks.length);
  const hrefs = [];
  for (const link of allLinks) {
    const href = await link.getAttribute('href').catch(() => '');
    if (href && href.includes('product')) hrefs.push(href);
  }
  console.log('product 포함 링크:', [...new Set(hrefs)].slice(0, 10));

  // img 태그 확인
  const imgs = await page.locator('img').all();
  console.log('\nimg 태그 수:', imgs.length);
  for (const img of imgs.slice(0, 10)) {
    const src = await img.getAttribute('src').catch(() => '');
    const alt = await img.getAttribute('alt').catch(() => '');
    if (src) console.log('  src:', src.slice(0, 100), '| alt:', alt);
  }

  // 제품 클릭 가능한 요소 확인
  const clickables = await page.locator('[role="button"], .sc-fNyeJO, .sc-Ybpel').all();
  console.log('\n클릭 가능 요소:', clickables.length);

  // 첫 번째 제품 클릭 테스트
  const firstProduct = await page.locator('[role="button"]').first();
  if (await firstProduct.count() > 0) {
    const text = await firstProduct.innerText().catch(() => '');
    console.log('\n첫 번째 제품:', text.slice(0, 100));
    await firstProduct.click();
    await page.waitForTimeout(2000);
    console.log('클릭 후 URL:', page.url());

    // 상세 페이지 이미지 확인
    const detailImgs = await page.locator('img').all();
    for (const img of detailImgs.slice(0, 5)) {
      const src = await img.getAttribute('src').catch(() => '');
      if (src && !src.includes('logo') && !src.includes('icon')) {
        console.log('상세 이미지:', src);
      }
    }
  }

  // HTML 구조 덤프 (제품 카드)
  const html = await page.content();
  const scIdx = html.indexOf('sc-emMPjM');
  if (scIdx > 0) {
    console.log('\n.sc-emMPjM 주변 HTML (1000자):');
    console.log(html.slice(scIdx - 50, scIdx + 950));
  }

  await browser.close();
}

main().catch(console.error);
