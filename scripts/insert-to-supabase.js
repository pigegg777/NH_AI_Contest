// scripts/insert-to-supabase.js
// JSON → Supabase 업로드
// 실행: SUPABASE_URL=... SUPABASE_KEY=... node scripts/insert-to-supabase.js

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // service_role key 필요

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요:');
  console.error('   SUPABASE_URL=https://xxx.supabase.co');
  console.error('   SUPABASE_KEY=service_role_key');
  process.exit(1);
}

const DATA_PATH = path.join(__dirname, '..', 'data', 'fertilizers-seed.json');
const products = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

async function insertBatch(batch, batchNum) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_fertilizers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',  // upsert
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ 배치 ${batchNum} 실패:`, err);
    return false;
  }
  return true;
}

async function main() {
  console.log(`📦 총 ${products.length}개 삽입 시작...`);

  const BATCH_SIZE = 100;
  let success = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const ok = await insertBatch(batch, batchNum);
    if (ok) {
      success += batch.length;
      console.log(`✅ 배치 ${batchNum}: ${i + 1}~${i + batch.length}개 완료`);
    }
  }

  console.log(`\n🎉 완료: ${success}/${products.length}개 삽입`);
}

main().catch(console.error);
