const cheerio = require('cheerio');

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,*/*' } });
  return { status: res.status, html: await res.text() };
}

async function main() {
  // 1. 제품 페이지 JS/AJAX 분석
  const { html } = await fetchHtml('http://www.chobi.co.kr/product/product_02/');
  const $ = cheerio.load(html);

  // KBoard 설정 찾기
  const scripts = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n');
  const kboardMatch = scripts.match(/kboard[^;]{0,200}/gi) || [];
  console.log('KBoard JS 패턴:', kboardMatch.slice(0, 5));

  // ajaxurl 찾기
  const ajaxMatch = scripts.match(/ajaxurl[^;]{0,100}/gi) || [];
  console.log('ajaxurl:', ajaxMatch.slice(0, 3));

  // nonce 패턴
  const nonceMatch = scripts.match(/nonce[^;]{0,50}/gi) || [];
  console.log('nonce:', nonceMatch.slice(0, 3));

  // board_id 패턴
  const boardMatch = scripts.match(/board_id[^;]{0,50}/gi) || [];
  console.log('board_id:', boardMatch.slice(0, 5));

  // wp-json REST API 시도
  console.log('\n=== WordPress REST API 시도 ===');
  await new Promise(r => setTimeout(r, 500));
  const r2 = await fetch('http://www.chobi.co.kr/wp-json/wp/v2/posts?search=%EC%9A%94%EC%86%8C&per_page=5', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const apiData = await r2.json().catch(() => null);
  console.log('REST API posts:', r2.status, Array.isArray(apiData) ? apiData.length + '개' : JSON.stringify(apiData)?.slice(0,200));

  await new Promise(r => setTimeout(r, 500));
  const r3 = await fetch('http://www.chobi.co.kr/wp-json/wp/v2/pages?per_page=10', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const pages = await r3.json().catch(() => null);
  if (Array.isArray(pages)) {
    console.log('REST API pages:', pages.map(p => p.slug).join(', '));
  }

  // KBoard API 시도
  await new Promise(r => setTimeout(r, 500));
  const r4 = await fetch('http://www.chobi.co.kr/wp-json/kboard/v1/board?board_id=product&per_page=10', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('KBoard REST:', r4.status, (await r4.text().catch(()=>'')).slice(0,200));

  // 2. 내용 HTML에서 실제 제품 데이터 찾기
  console.log('\n=== HTML 내 제품 데이터 검색 ===');
  const nonceInHtml = html.match(/kboard_nonce['":\s]+([a-zA-Z0-9_]+)/);
  const boardIdInHtml = html.match(/board_id['":\s]+([a-zA-Z0-9_-]+)/);
  console.log('nonce in HTML:', nonceInHtml?.[1]);
  console.log('board_id in HTML:', boardIdInHtml?.[1]);

  // 제품 링크 패턴
  const productLinks = html.match(/href="[^"]*product_02[^"]*uid=[^"]+"/g) || [];
  console.log('제품 링크 with uid:', productLinks.slice(0, 5));

  // KBoard AJAX 시도
  console.log('\n=== KBoard AJAX 시도 ===');
  const ajaxurlMatch = scripts.match(/["']([^"']*admin-ajax[^"']+)["']/);
  const ajaxUrl = ajaxurlMatch?.[1] || 'http://www.chobi.co.kr/wp-admin/admin-ajax.php';
  console.log('ajaxUrl:', ajaxUrl);

  await new Promise(r => setTimeout(r, 500));
  const kboardNonce = nonceInHtml?.[1] || '';
  const kboardBoardId = boardIdInHtml?.[1] || 'product';

  const body = new URLSearchParams({
    action: 'kboard_list',
    board_id: kboardBoardId,
    nonce: kboardNonce,
    page: '1',
  });
  const r5 = await fetch(ajaxUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    body: body.toString(),
  });
  console.log('KBoard AJAX list:', r5.status, (await r5.text().catch(()=>'')).slice(0, 300));

  // 3. Playwright 없이 분석 가능한지 확인: iframe
  const iframes = $('iframe').map((_, el) => $(el).attr('src')).get();
  console.log('\niframe srcs:', iframes.slice(0, 5));

  // 4. 실제 HTML 내 제품 데이터 (kboard 형태로)
  const kboardHtml = html.indexOf('kboard');
  if (kboardHtml > 0) {
    console.log('\nkboard 주변 HTML:', html.slice(kboardHtml - 100, kboardHtml + 400));
  }
}

main().catch(console.error);
