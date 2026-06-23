// 협화: 클릭 이벤트 + 상세 페이지 분석
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 검색 페이지 로드
  await page.goto('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // 제품 카드 구조 파악
  const html = await page.content();

  // sc-fgcRbO 요소 확인
  const items = await page.locator('.sc-fgcRbO').all();
  console.log('sc-fgcRbO 요소 수:', items.length);

  // 첫 번째 제품 텍스트 확인
  if (items.length > 0) {
    const text = await items[0].innerText().catch(() => '');
    console.log('첫 번째 제품:', text.slice(0, 100).replace(/\n/g, '|'));
    const imgSrc = await items[0].locator('img').getAttribute('src').catch(() => '');
    console.log('이미지 src (truncated):', imgSrc.slice(0, 150));
    // S3 base URL (query string 제거)
    const baseUrl = imgSrc.split('?')[0];
    console.log('S3 base URL:', baseUrl);
  }

  // 첫 번째 role=button 클릭 → URL 변경 확인
  console.log('\n=== 클릭 테스트 ===');
  await page.locator('[role="button"]').first().click();
  await page.waitForTimeout(2000);
  console.log('클릭 후 URL:', page.url());

  const newHtml = await page.content();
  const newUrl = page.url();

  if (newUrl !== 'https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC') {
    console.log('상세 페이지로 이동 확인');
    // 상세 이미지
    const detailImgs = await page.locator('img').all();
    for (const img of detailImgs) {
      const src = await img.getAttribute('src').catch(() => '');
      const alt = await img.getAttribute('alt').catch(() => '');
      if (src && src.includes('hyeophwa.s3')) {
        console.log('상세 이미지:', src.slice(0, 150));
        console.log('alt:', alt);
      }
    }
  } else {
    // URL이 바뀌지 않았다면 SPA 라우팅 방식 확인
    console.log('URL 변경 없음. 모달/패널 방식일 가능성');
    // 페이지 텍스트 변화 확인
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('클릭 후 페이지 텍스트 (300자):', bodyText.slice(0, 300));
  }

  // 네트워크 요청 모니터링으로 API 호출 확인
  console.log('\n=== API 호출 확인 ===');
  await page.goto('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC', { waitUntil: 'networkidle', timeout: 20000 });

  const apiCalls = [];
  page.on('response', r => {
    const url = r.url();
    if (url.includes('api') || url.includes('product') || url.includes('khhc')) {
      apiCalls.push({ url: url.slice(0, 120), status: r.status() });
    }
  });

  await page.waitForTimeout(1000);
  await page.locator('[role="button"]').first().click();
  await page.waitForTimeout(2000);
  console.log('API 호출들:');
  apiCalls.forEach(c => console.log(' ', c.status, c.url));
  console.log('클릭 후 최종 URL:', page.url());

  await browser.close();
}

main().catch(console.error);
