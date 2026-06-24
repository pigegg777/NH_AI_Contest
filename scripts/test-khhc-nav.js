// 협화 사이트 네비게이션 방식 확인
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 네트워크 요청 캡처
  const requests = [];
  page.on('request', r => {
    const url = r.url();
    if (!url.includes('amazonaws') && !url.includes('google') && !url.includes('kakao') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('.svg')) {
      requests.push(url);
    }
  });

  await page.goto('https://www.khhc.co.kr/product?keyword=%EB%95%85%EC%8B%AC', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log('네트워크 요청 (HTML 제외):', requests.slice(-10));

  // 제품 카드에서 URL 관련 정보 추출
  const html = await page.content();

  // href 패턴 찾기
  const hrefMatches = html.match(/href="[^"]*product[^"]*"/g) || [];
  console.log('\nhref 패턴:', hrefMatches.slice(0, 10));

  // data-id 또는 id 패턴 찾기
  const idMatches = html.match(/data-id="[^"]*"|id="product[^"]*"/g) || [];
  console.log('id 패턴:', idMatches.slice(0, 10));

  // onClick 또는 navigate 패턴 찾기
  const navMatches = html.match(/navigate|useNavigate|router\.push|history\.push/g) || [];
  console.log('navigate 패턴:', navMatches.slice(0, 5));

  // 직접 제품 리스트 추출 (이미지 alt + src)
  console.log('\n=== 현재 페이지 제품 목록 ===');
  const imgs = await page.locator('img[alt][src*="hyeophwa.s3"]').all();
  console.log('S3 이미지 수:', imgs.length);
  for (const img of imgs) {
    const alt = await img.getAttribute('alt').catch(() => '');
    const src = await img.getAttribute('src').catch(() => '');
    const baseUrl = src.split('?')[0];
    console.log(`  alt="${alt}" → ${baseUrl}`);
  }

  // 제품 이름 옆 텍스트 (함유성분, 시비량 등)
  console.log('\n=== sc-fgcRbO 제품 텍스트 추출 ===');
  const cards = await page.locator('.sc-fgcRbO').all();
  for (const card of cards) {
    const text = await card.innerText().catch(() => '');
    const lines = text.split('\n').filter(l => l.trim());
    const name = lines.find(l => l.length < 20) || lines[0];
    const imgSrc = await card.locator('img').getAttribute('src').catch(() => '');
    console.log(`  [${name}] img: ${imgSrc ? imgSrc.split('?')[0].split('/').pop() : 'none'}`);
  }

  // S3 URL 서명 없이 접근 가능한지 테스트
  console.log('\n=== S3 URL 공개 접근 테스트 ===');
  if (imgs.length > 0) {
    const src = await imgs[0].getAttribute('src');
    const baseUrl = src.split('?')[0];
    console.log('테스트 URL:', baseUrl);
    try {
      const r = await fetch(baseUrl);
      console.log('공개 접근:', r.status, r.ok ? 'OK' : 'DENIED');
    } catch (e) {
      console.log('접근 실패:', e.message);
    }
  }

  // 검색 input에 직접 입력 테스트
  console.log('\n=== 검색 input 테스트 ===');
  await page.goto('https://www.khhc.co.kr/product', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);
  const input = page.locator('input').first();
  await input.fill('땅심명가');
  await input.press('Enter');
  await page.waitForTimeout(2000);
  console.log('Enter 후 URL:', page.url());
  const resultImgs = await page.locator('img[src*="hyeophwa.s3"]').all();
  console.log('결과 이미지:', resultImgs.length);
  for (const img of resultImgs) {
    const alt = await img.getAttribute('alt').catch(() => '');
    const src = await img.getAttribute('src').catch(() => '');
    console.log('  ', alt, '-', src.split('?')[0].split('/').pop());
  }

  await browser.close();
}

main().catch(console.error);
