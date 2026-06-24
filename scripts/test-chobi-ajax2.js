const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr/knco';

async function searchAjax(term) {
  console.log(`\n=== product02Ajax.php skskSearch4="${term}" ===`);
  const body = new URLSearchParams({
    pageIndex: '1', pageCountSize: '', newType: '',
    skskSearch: '', skskSearch2: '', skskSearch3: '',
    skskSearch4: term,
    skskNowPage: 'product02Use.php', nxoInner: 'y'
  });
  const res = await fetch(`${base}/product02Ajax.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${base}/product02Use.php?skskSearch4=${encodeURIComponent(term)}&nxoInner=y`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });
  const html = await res.text();
  console.log('status:', res.status, 'len:', html.length);

  const $ = cheerio.load(html);
  // 실제 제품명 찾기
  $('a').each((_, el) => {
    const txt = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const img = $(el).find('img').attr('src') || '';
    if (txt.length > 1) console.log(` name="${txt.slice(0,40)}" href="${href.slice(0,60)}" img="${img.slice(0,50)}"`);
  });

  // strong, span 안의 텍스트
  console.log('\nstrong/span 텍스트:');
  $('strong, .name, .title, h3, h4').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt.length > 1) console.log(' -', txt.slice(0, 50));
  });

  if (html.length < 6000) console.log('\n--- HTML ---\n', html);
}

(async () => {
  await searchAjax('단한번');
  await searchAjax('요소');
})().catch(console.error);
