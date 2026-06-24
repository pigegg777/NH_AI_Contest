const cheerio = require('cheerio');
const base = 'http://www.chobi.co.kr';

async function test(term) {
  // POST 시도
  const body = new URLSearchParams({ searchItemNm: term, nxoInner: 'y' });
  const postRes = await fetch(`${base}/knco/product02New.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${base}/knco/product02New.php?nxoInner=y`,
    },
    body: body.toString(),
  });
  const html = await postRes.text();
  const $ = cheerio.load(html);
  console.log(`POST status=${postRes.status} len=${html.length}`);

  // 실제 제품 div 구조 찾기
  const allDivs = [];
  $('div[class], ul[class]').each((_, el) => {
    const cls = $(el).attr('class');
    const cnt = $(el).find('a').length;
    if (cnt > 1 && cls) allDivs.push({ cls, cnt });
  });
  console.log('div/ul with links:', allDivs.slice(0, 10));

  // img 있는 a태그
  const withImg = $('a:has(img)');
  console.log('\na:has(img) 수:', withImg.length);
  withImg.slice(0, 5).each((_, el) => {
    console.log(' -', $(el).text().trim().slice(0,30), '|', $(el).attr('href'), '| img:', $(el).find('img').attr('src')?.slice(0,60));
  });

  // 전체 HTML 에서 제품명 패턴 찾기
  console.log('\n--- 비료/제품 관련 텍스트 ---');
  html.match(/[가-힣]{2,}(?:비료|복합|단비|원예|요소)[가-힣]*/g)?.slice(0,10).forEach(m => console.log(' ', m));
}

test('요소').catch(console.error);
