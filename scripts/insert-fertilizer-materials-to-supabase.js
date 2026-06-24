// scripts/insert-fertilizer-materials-to-supabase.js
// data/fertilizer-materials-seed.json → static_pesticide 업로드 (upsert)
// 실행: node scripts/insert-fertilizer-materials-to-supabase.js
// .env (루트) 의 SUPABASE_URL / SUPABASE_KEY(service_role) 사용

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('환경변수 필요 (.env): SUPABASE_URL, SUPABASE_KEY (service_role)');
  process.exit(1);
}

const DATA_PATH = path.join(__dirname, '..', 'data', 'fertilizer-materials-seed.json');
const products = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

async function insertBatch(batch, batchNum) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_pesticide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`배치 ${batchNum} 실패:`, err);
    return false;
  }
  return true;
}

async function main() {
  console.log(`총 ${products.length}개 삽입 시작...`);

  const BATCH_SIZE = 100;
  let success = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const ok = await insertBatch(batch, batchNum);
    if (ok) {
      success += batch.length;
      console.log(`배치 ${batchNum}: ${i + 1}~${i + batch.length}개 완료`);
    }
  }

  console.log(`완료: ${success}/${products.length}개 삽입`);
}

main().catch(console.error);
