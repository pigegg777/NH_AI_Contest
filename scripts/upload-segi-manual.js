// scripts/upload-segi-manual.js
// data/segi-manual.json → Supabase DB 업데이트

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'segi-manual.json'), 'utf-8')
).filter(r => r.product_code);

async function main() {
  console.log(`📦 세기 수동 데이터 ${data.length}개 업로드`);
  let ok = 0;
  for (const row of data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${row.product_code}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ img_url: row.img_url || null, product_url: row.product_url || null }),
      }
    );
    console.log(`  ${res.ok ? '✅' : '❌'} ${row.product_code}`);
    if (res.ok) ok++;
  }
  console.log(`\n완료: ${ok}/${data.length}`);
}

main().catch(console.error);
