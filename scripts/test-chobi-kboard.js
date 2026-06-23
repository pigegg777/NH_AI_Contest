const cheerio = require('cheerio');

async function getChobi(term) {
  // 1단계: 페이지에서 nonce 추출
  const pageRes = await fetch('http://www.chobi.co.kr/product/product_02/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();

  const nonceMatch = html.match(/"ajax_security"\s*:\s*"([^"]+)"/);
  const nonce = nonceMatch?.[1];
  console.log('nonce:', nonce);

  // iframe 확인 (advanced_iframe 사용 중)
  const $ = cheerio.load(html);
  const iframe = $('#advanced_iframe');
  console.log('iframe src:', iframe.attr('src'));

  if (!nonce) { console.log('nonce 없음'); return; }

  // 2단계: KBoard AJAX 액션 시도
  const actions = ['kboard_document_list', 'kboard_list', 'kboard_search', 'kboard'];
  for (const action of actions) {
    const body = new URLSearchParams({
      action,
      security: nonce,
      nonce,
      search: term,
      keyword: term,
      s: term,
    });
    const r = await fetch('http://www.chobi.co.kr/wp/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'http://www.chobi.co.kr/product/product_02/',
      },
      body: body.toString(),
    });
    const txt = await r.text();
    console.log(`\n[${action}] status=${r.status} len=${txt.length}`);
    if (txt !== '0' && txt !== '-1' && txt.length > 5) console.log(txt.slice(0, 300));
  }
}

getChobi('요소').catch(console.error);
