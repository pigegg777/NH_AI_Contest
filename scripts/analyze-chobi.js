const cheerio = require('cheerio');

async function analyze() {
  const res = await fetch('http://www.chobi.co.kr/product/product_02/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('=== 1. #skskList 내용 ===');
  console.log($('#skskList').html()?.slice(0, 500) || '비어있음');

  console.log('\n=== 2. script 중 product/search/ajax 관련 ===');
  $('script').each((i, el) => {
    const src = $(el).attr('src') || '';
    const txt = $(el).html() || '';
    if (txt.match(/product|search|sksk|item|list/i) || src.match(/product|search/i)) {
      console.log(`[script ${i}] src=${src}`);
      if (!src) console.log(txt.slice(0, 400));
    }
  });

  console.log('\n=== 3. form 태그 ===');
  $('form').each((i, el) => {
    console.log(`form[${i}] action="${$(el).attr('action')}" method="${$(el).attr('method')}"`);
    $(el).find('input').each((j, inp) => {
      console.log(`  input name="${$(inp).attr('name')}" type="${$(inp).attr('type')}"`);
    });
  });

  console.log('\n=== 4. REST API 탐색 ===');
  // WordPress REST API
  const wpApi = await fetch('http://www.chobi.co.kr/wp/wp-json/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const wpData = await wpApi.json().catch(() => null);
  if (wpData) {
    const routes = Object.keys(wpData.routes || {}).filter(r => r.includes('product') || r.includes('post'));
    console.log('WP REST 라우트:', routes.slice(0, 10));
  }

  // Custom Post Type 탐색
  const cptRes = await fetch('http://www.chobi.co.kr/wp/wp-json/wp/v2/types', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const cptData = await cptRes.json().catch(() => null);
  if (cptData) console.log('CPT 목록:', Object.keys(cptData));
}

analyze().catch(console.error);
