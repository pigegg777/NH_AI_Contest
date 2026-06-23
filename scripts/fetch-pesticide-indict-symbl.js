// scripts/fetch-pesticide-indict-symbl.js
// PSIS(농약안전정보시스템/NCPMS) OpenAPI로 작용기작(indictSymbl)을 조회해
// static_pesticide.indict_symbl 컬럼을 채운다.
// 실행: node scripts/fetch-pesticide-indict-symbl.js [--limit=200] [--delay=400]
//
// product_name(상표명칭)을 그대로 pestiBrandName으로 요청한다 (정규화 없음).
// 동일한 product_name을 가진 모든 static_pesticide 행에 결과를 일괄 반영한다.
// data/pesticide-indict-symbl-progress.json 에 처리한 product_name을 기록해
// 재실행 시 이어서 처리(resume)할 수 있다.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', 'react-app', '.env') });

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const API_KEY = process.env.VITE_RDA_API_KEY;
const BASE_URL = 'http://psis.rda.go.kr/openApi/service.do';

const PROGRESS_PATH = path.join(__dirname, '..', 'data', 'pesticide-indict-symbl-progress.json');

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const LIMIT = Number(getArg('limit', '200'));
const DELAY_MS = Number(getArg('delay', '400'));

function decodeXmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeXmlEntities(m[1]).trim() : '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchIndictSymbl(pestiBrandName) {
  const usp = new URLSearchParams({
    apiKey: API_KEY,
    serviceCode: 'SVC01',
    serviceType: 'AA001',
    pestiBrandName,
    displayCount: '1',
    startPoint: '1',
  });
  const res = await fetch(`${BASE_URL}?${usp.toString()}`);
  const xml = await res.text();

  const errorCode = extractTag(xml, 'errorCode');
  if (errorCode) {
    throw new Error(`PSIS API ${errorCode}: ${extractTag(xml, 'errorMsg')}`);
  }

  const firstItem = xml.match(/<item>([\s\S]*?)<\/item>/);
  if (!firstItem) {
    return null;
  }

  return extractTag(firstItem[1], 'indictSymbl') || null;
}

async function fetchProductNameGroups() {
  const groups = new Map();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/static_pesticide?select=product_code,product_name&order=product_code&offset=${offset}&limit=${pageSize}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }

    rows.forEach((row) => {
      const name = row.product_name;

      if (!name) {
        return;
      }

      if (!groups.has(name)) {
        groups.set(name, []);
      }

      groups.get(name).push(row.product_code);
    });

    offset += pageSize;

    if (rows.length < pageSize) {
      break;
    }
  }

  return groups;
}

async function updateIndictSymbl(productCodes, indictSymbl) {
  const filter = productCodes.map((code) => encodeURIComponent(code)).join(',');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/static_pesticide?product_code=in.(${filter})`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ indict_symbl: indictSymbl }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`업데이트 실패 (${res.status}): ${text}`);
  }
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8');
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('환경변수 필요 (.env): SUPABASE_URL, SUPABASE_KEY (service_role)');
  }

  if (!API_KEY) {
    throw new Error('VITE_RDA_API_KEY 환경변수가 없습니다 (react-app/.env 확인)');
  }

  const productNameGroups = await fetchProductNameGroups();
  const progress = loadProgress();

  const pending = [...productNameGroups.entries()].filter(([name]) => !(name in progress));
  const targets = pending.slice(0, LIMIT);

  console.log(
    `전체 상표명 ${productNameGroups.size}개 / 미처리 ${pending.length}개 / 이번 실행 ${targets.length}개`,
  );

  let matched = 0;
  let empty = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const [productName, productCodes] = targets[i];

    try {
      const indictSymbl = await fetchIndictSymbl(productName);
      await updateIndictSymbl(productCodes, indictSymbl);
      progress[productName] = indictSymbl;

      if (indictSymbl) {
        matched++;
      } else {
        empty++;
      }

      console.log(
        `[${i + 1}/${targets.length}] ${productName} -> ${indictSymbl ?? '(없음)'} (적용 ${productCodes.length}건)`,
      );
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${targets.length}] ${productName} 실패: ${err.message}`);
    }

    if ((i + 1) % 25 === 0) {
      saveProgress(progress);
      console.log(`  ...중간 저장 (${i + 1}/${targets.length})`);
    }

    if (i < targets.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  saveProgress(progress);
  console.log(`\n완료: 매칭 ${matched}개 / 빈결과 ${empty}개 / 실패 ${failed}개`);
  console.log(`진행 상황 저장: ${PROGRESS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
