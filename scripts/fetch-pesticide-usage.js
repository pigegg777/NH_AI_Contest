// scripts/fetch-pesticide-usage.js
// PSIS(농약안전정보시스템) OpenAPI로 product_usage(작물별 적용병해충/사용기준) 채우기
// 실행: node scripts/fetch-pesticide-usage.js [--limit=30] [--delay=400]
//
// data/pesticides-seed.json 을 in-place로 업데이트한다.
// 항목별 usage_fetched=true 로 표시해 재실행 시 이어서 처리(resume) 가능.

require('dotenv').config({ path: require('path').join(__dirname, '..', 'react-app', '.env') });

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'data', 'pesticides-seed.json');
const API_KEY = process.env.VITE_RDA_API_KEY;
const BASE_URL = 'http://psis.rda.go.kr/openApi/service.do';

const USAGE_FIELDS = ['cropName', 'diseaseWeedName', 'pestiUse', 'dilutUnit', 'useSuittime', 'useNum'];
const PAGE_SIZE = 50;

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const LIMIT = Number(getArg('limit', '30'));
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

function parseServiceXml(xml) {
  const errorCode = extractTag(xml, 'errorCode');
  if (errorCode) {
    throw new Error(`PSIS API ${errorCode}: ${extractTag(xml, 'errorMsg')}`);
  }

  const totalCountMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/);
  const totalCount = totalCountMatch ? Number(totalCountMatch[1]) : 0;

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const item = {};
    for (const field of USAGE_FIELDS) {
      item[field] = extractTag(block, field);
    }
    return item;
  });

  return { totalCount, items };
}

async function fetchPage(pestiBrandName, startPoint) {
  const usp = new URLSearchParams({
    apiKey: API_KEY,
    serviceCode: 'SVC01',
    serviceType: 'AA001',
    pestiBrandName,
    displayCount: String(PAGE_SIZE),
    startPoint: String(startPoint),
  });
  const res = await fetch(`${BASE_URL}?${usp.toString()}`);
  const xml = await res.text();
  return parseServiceXml(xml);
}

async function fetchAllUsage(pestiBrandName) {
  // 페이지당 최대 PAGE_SIZE(50)건만 수집 (totalCount가 더 커도 1페이지만)
  return fetchPage(pestiBrandName, 1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!API_KEY) {
    throw new Error('VITE_RDA_API_KEY 환경변수가 없습니다 (react-app/.env 확인)');
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const pending = seed.filter((p) => !p.usage_fetched);
  const targets = pending.slice(0, LIMIT);

  console.log(`전체 ${seed.length}개 / 미처리 ${pending.length}개 / 이번 실행 ${targets.length}개`);

  let matched = 0;
  let empty = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];

    if (!p.product_name) {
      p.product_usage = [];
      p.usage_fetched = true;
      empty++;
      continue;
    }

    try {
      const { totalCount, items } = await fetchAllUsage(p.product_name);
      p.product_usage = items;
      p.usage_fetched = true;
      if (totalCount > 0) {
        matched++;
      } else {
        empty++;
      }
      console.log(
        `[${i + 1}/${targets.length}] ${p.product_code} ${p.product_name} -> ${items.length}건`,
      );
    } catch (err) {
      console.error(`[${i + 1}/${targets.length}] ${p.product_code} ${p.product_name} 실패: ${err.message}`);
    }

    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      console.log(`  ...중간 저장 (${i + 1}/${targets.length})`);
    }

    if (i < targets.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf-8');
  console.log(`\n완료: 매칭 ${matched}개 / 빈결과 ${empty}개`);
  console.log(`저장: ${SEED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
