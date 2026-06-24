// 협화 사이트 Playwright로 DOM 구조 분석
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });

  // 검색 페이지 로드
  console.log('=== 검색 URL 테스트: 땅심 ===');
  await page.goto('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // 현재 URL 확인
  console.log('현재 URL:', page.url());

  // 제목 확인
  console.log('title:', await page.title());

  // 주요 선택자 확인
  const selectors = [
    '.sc-emMPjM', '.sc-bsDpAt',
    'a[href*="/product/"]', 'a[href*="product"]',
    '.product', '[class*="product"]', '[class*="Product"]',
    'img', 'ul li a', '.list', '[class*="list"]',
    '[class*="item"]', '[class*="card"]',
    'input[placeholder*="검색"]', 'input[type="search"]',
  ];

  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) console.log(`  ${sel}: ${count}개`);
  }

  // 전체 텍스트 일부
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('\n페이지 텍스트 (500자):', bodyText.slice(0, 500));

  // HTML 구조 확인 (제품 관련 부분)
  const html = await page.content();
  const productIdx = html.indexOf('땅심');
  if (productIdx > 0) {
    console.log('\n"땅심" 주변 HTML (600자):');
    console.log(html.slice(Math.max(0, productIdx - 200), productIdx + 400));
  } else {
    console.log('\n"땅심" 텍스트 없음. HTML 길이:', html.length);
    // body 내 class들 확인
    const classes = html.match(/class="([^"]+)"/g)?.slice(0, 20).join('\n') || '';
    console.log('처음 20개 class:', classes);
  }

  // 검색 input 찾기
  const inputCount = await page.locator('input').count();
  console.log('\ninput 태그 수:', inputCount);
  for (let i = 0; i < Math.min(inputCount, 5); i++) {
    const el = page.locator('input').nth(i);
    const placeholder = await el.getAttribute('placeholder').catch(() => '');
    const type = await el.getAttribute('type').catch(() => '');
    console.log(`  input[${i}]: type="${type}" placeholder="${placeholder}"`);
  }

  await browser.close();
}

main().catch(console.error);
