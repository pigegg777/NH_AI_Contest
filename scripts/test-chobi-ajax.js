const cheerio = require('cheerio');

async function searchChobi(term) {
  const body = new URLSearchParams({
    action: 'avada_live_search',
    query: term,
    page: '1',
  });
  const res = await fetch('http://www.chobi.co.kr/wp/wp-admin/admin-ajax.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'http://www.chobi.co.kr/product/product_02/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });
  const text = await res.text();
  console.log(`\n=== 조비 AJAX "${term}" (status ${res.status}) ===`);
  console.log(text.slice(0, 500));
}

(async () => {
  await searchChobi('유안');
  await searchChobi('요소');
  await searchChobi('유황');
})().catch(console.error);
