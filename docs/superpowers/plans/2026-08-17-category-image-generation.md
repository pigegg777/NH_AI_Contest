# 분류별(중분류) AI 대체 이미지 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `img_url`이 없는 상품이 속한 medium_category(중분류)마다, 사용자가 버튼을 눌러 OpenAI 이미지 생성 API로 대체 카드 이미지를 만들고, 기존 `office_page_config.category_detail_config` JSONB에 저장해 공개 스토어프론트 페이지에 "AI 생성 이미지" 배지와 함께 영속적으로 반영한다.

**Architecture:** `card-style.js`와 동일한 인증/검증 스캐폴드를 재사용하는 새 Cloudflare Function(`category-image.js`)이 새 `openAiImageRequest.js` 클라이언트로 OpenAI Images API를 호출해 base64 이미지를 받는다. 저장은 새 테이블 없이 기존 `category_config` JSONB에 `generatedCategoryImages`(medium_category → 이미지 엔트리 맵) 필드를 얹어 기존 저장/조회 파이프라인(`normalizeCategoryConfig`/`buildCategoryConfigRow`/`buildStorefrontSavePayload`/`upsertStorefrontConfig`/`fetchStorefrontConfig`)을 그대로 통과시킨다. 프론트엔드는 카드 디자인 작업 공간(`card` 모드)에 카테고리별 생성 버튼을 추가하고, `CardGridSection`이 `img_url` 없을 때 이 맵을 fallback으로 사용해 배지와 함께 렌더링한다.

**Tech Stack:** React 18, Cloudflare Pages Functions, Supabase (Postgres + JS client), Vitest + Testing Library, OpenAI Images API (`gpt-image-2`, `response_format: 'b64_json'`).

**Spec:** `C:\Users\pigeg\.gstack\projects\AI\pigeg-main-design-20260817-114721.md` ("분류별(중분류) AI 대체 이미지 생성", Status: APPROVED)

## Global Constraints

- 해커톤 스코프 — 프로덕션급 견고성(레이트리밋, 재시도, 콘텐츠 모더레이션 이중화) 불필요, happy path + 최소 에러 처리.
- 새 테이블/버킷/스토리지 인프라를 만들지 않는다 — `office_page_config` 기존 JSONB 컬럼만 확장(Approach A).
- 생성 단위는 medium_category(중분류) — productCategoryName(대분류/상품군) 단위가 아니다.
- 트리거는 사용자의 명시적 버튼 클릭만 — 업로드 시 자동 생성도, 렌더링 시 lazy 생성도 하지 않는다.
- AI 생성 이미지에는 반드시 프론트엔드 오버레이 배지(`"AI 생성 이미지"`)를 붙인다 — 프롬프트에 배지를 그리게 하지 않는다.
- 생성 버튼은 요청 in-flight 동안 반드시 비활성화한다(연타로 인한 중복 과금 방지).
- "대표 상품"은 해당 medium_category에 속한 상품 중 엑셀 원본 행 순서상 첫 번째로 정의한다.

**스펙 대비 정정 사항(계획 수립 중 발견, 스펙 자체의 결함):** 스펙 문서의 JSON 예시는 `generatedCategoryImage`(단수, 객체 하나)로 적혀 있었지만, 스펙의 Premise 2가 이미 "생성 단위는 medium_category"라고 명시했고 하나의 productCategoryName(예: "Fertilizer Upload")은 대개 여러 medium_category(예: "복합비료", "유기질비료")를 갖는다. 따라서 이 계획은 `generatedCategoryImages`(복수, medium_category → 엔트리 맵)로 구현한다 — 스펙의 의도(중분류 단위 생성)를 정확히 구현하려면 이 형태가 유일하게 맞다.

---

## File Structure

**신규 파일:**
- `react-app/functions/lib/openAiImageRequest.js` — OpenAI Images API 클라이언트
- `react-app/functions/lib/__tests__/openAiImageRequest.test.js`
- `react-app/functions/api/storefront-ai/category-image.js` — 새 엔드포인트
- `react-app/functions/api/storefront-ai/__tests__/category-image.test.js`
- `react-app/src/features/storefront/services/card-design/categoryImageGateway.js` — 프론트엔드 클라이언트
- `react-app/src/features/storefront/__tests__/categoryImageGateway.test.js`
- `react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.jsx` — 트리거 UI
- `react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.module.css`
- `react-app/src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx`

**수정 파일:**
- `react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js` — `generatedCategoryImages` 정규화/저장/로드
- `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`
- `react-app/src/features/storefront/model/storefront-config/sectionMatching.js` — 섹션에 `generatedCategoryImages` 전달
- `react-app/src/features/storefront/__tests__/sectionMatching.test.js` (신규 — 기존에 이 모델 전용 테스트 파일 없음, 새로 생성)
- `react-app/src/features/storefront/hooks/useCardAiDesign.js` — 상태 + `generateCategoryImage()` 액션
- `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`
- `react-app/src/features/storefront/hooks/useStorefrontBuilder.js` — 5개 지점에 배관 연결
- `react-app/src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx` (훅 전용 테스트 파일이 없어 기존 컴포넌트 통합 테스트에 케이스 추가)
- `react-app/src/features/storefront/components/CardGridSection.jsx` — fallback 이미지 소스 계산
- `react-app/src/features/storefront/components/card-grid-section/CardImageSection.jsx` — 배지 오버레이
- `react-app/src/features/storefront/components/CardGridSection.module.css` — 배지 스타일
- `react-app/src/features/storefront/__tests__/CardGridSection.test.jsx`
- `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx` — 새 패널 삽입
- `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx` — `categoryImageMode` prop 전달

---

## Task 1: OpenAI 이미지 생성 클라이언트

**Files:**
- Create: `react-app/functions/lib/openAiImageRequest.js`
- Test: `react-app/functions/lib/__tests__/openAiImageRequest.test.js`

**Interfaces:**
- Produces: `requestOpenAiImage(prompt: string, apiKey: string): Promise<{ imageDataUri: string }>` — Task 2가 이 함수를 import해서 쓴다.

- [ ] **Step 1: Write the failing test**

```js
// react-app/functions/lib/__tests__/openAiImageRequest.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestOpenAiImage } from '../openAiImageRequest';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('requestOpenAiImage', () => {
  it('posts to the OpenAI images endpoint and returns a data URI built from the base64 payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await requestOpenAiImage('a bag of fertilizer, studio photo style', 'sk-test');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-test',
        }),
      }),
    );
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe('a bag of fertilizer, studio photo style');
    expect(sentBody.response_format).toBe('b64_json');
    expect(result).toEqual({ imageDataUri: 'data:image/png;base64,ZmFrZS1wbmc=' });
  });

  it('throws with the OpenAI error message when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'invalid prompt' } }),
      }),
    );

    await expect(requestOpenAiImage('bad prompt', 'sk-test')).rejects.toThrow(
      'OpenAI Image API request failed: invalid prompt',
    );
  });

  it('throws a generic message when the response has no data payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );

    await expect(requestOpenAiImage('prompt', 'sk-test')).rejects.toThrow(
      'OpenAI returned no image data.',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run functions/lib/__tests__/openAiImageRequest.test.js`
Expected: FAIL with "Cannot find module '../openAiImageRequest'" (or similar module-not-found)

- [ ] **Step 3: Write minimal implementation**

```js
// react-app/functions/lib/openAiImageRequest.js
import { toTrimmedString } from '../../src/common/utils/text.js';

const OPENAI_IMAGES_API_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

async function readOpenAiImageError(response) {
  try {
    const errorBody = await response.json();
    const message = toTrimmedString(errorBody?.error?.message);

    if (message) {
      return message;
    }
  } catch {
    // fall through to plain text below
  }

  try {
    return toTrimmedString(await response.text());
  } catch {
    return '';
  }
}

export async function requestOpenAiImage(prompt, apiKey, { model = DEFAULT_IMAGE_MODEL } = {}) {
  const response = await fetch(OPENAI_IMAGES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const message = await readOpenAiImageError(response);
    throw new Error(
      message
        ? `OpenAI Image API request failed: ${message}`
        : `OpenAI Image API request failed with status ${response.status}.`,
    );
  }

  const responseBody = await response.json();
  const b64 = responseBody?.data?.[0]?.b64_json;

  if (typeof b64 !== 'string' || !b64) {
    throw new Error('OpenAI returned no image data.');
  }

  return { imageDataUri: `data:image/png;base64,${b64}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run functions/lib/__tests__/openAiImageRequest.test.js`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/lib/openAiImageRequest.js react-app/functions/lib/__tests__/openAiImageRequest.test.js
git commit -m "feat(storefront-ai): add OpenAI image generation client"
```

---

## Task 2: `category-image` 엔드포인트

**Files:**
- Create: `react-app/functions/api/storefront-ai/category-image.js`
- Test: `react-app/functions/api/storefront-ai/__tests__/category-image.test.js`

**Interfaces:**
- Consumes: `requestOpenAiImage(prompt, apiKey)` from Task 1 — returns `{ imageDataUri }`.
- Consumes: `requireOwnedOffice({ request, env, officeCode })` (existing, `functions/lib/officeOwnershipGuard.js`).
- Consumes: `readValidatedJsonBody`, `pickAllowedKeys`, `readOfficeCode`, `assertPromptWithinLimit`, `withRequestErrorHandling` (existing, `functions/lib/requestValidation.js`).
- Consumes: `jsonResponse`, `errorResponse` (existing, `functions/lib/jsonResponse.js`).
- Produces: `POST /api/storefront-ai/category-image` → `200 { mediumCategory, imageDataUri, prompt }` on success. Task 5 (frontend gateway) calls this endpoint and consumes this exact response shape.

- [ ] **Step 1: Write the failing test**

```js
// react-app/functions/api/storefront-ai/__tests__/category-image.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { onRequestPost } from '../category-image';

const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  OPENAI_API_KEY: 'sk-test',
};

function buildSupabaseStub({ user = { id: 'user-1' }, officeCode = 'OFF-1' } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { office_code: officeCode }, error: null }),
        })),
      })),
    })),
  };
}

function buildRequest(body, { authorization = 'Bearer test-token' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });

  if (authorization) {
    headers.set('authorization', authorization);
  }

  return new Request('https://example.com/api/storefront-ai/category-image', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/storefront-ai/category-image', () => {
  it('returns 401 when no bearer token is present', async () => {
    const request = buildRequest(
      { officeCode: 'OFF-1', mediumCategory: '복합비료' },
      { authorization: '' },
    );

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(401);
  });

  it('returns 403 when officeCode does not match the profile', async () => {
    createClient.mockReturnValue(buildSupabaseStub({ officeCode: 'OFF-OTHER' }));
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(403);
  });

  it('returns 422 when mediumCategory is missing', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(422);
  });

  it('returns 502 when OpenAI fails', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }),
    );
    const request = buildRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' });

    const response = await onRequestPost({ request, env: TEST_ENV });

    expect(response.status).toBe(502);
  });

  it('returns 200 with mediumCategory, imageDataUri, and the auto-built prompt on success', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
      }),
    );
    const request = buildRequest({
      officeCode: 'OFF-1',
      mediumCategory: '복합비료',
      representativeProductFields: { spec: '20kg', nutrient: '18-18-18' },
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mediumCategory).toBe('복합비료');
    expect(body.imageDataUri).toBe('data:image/png;base64,ZmFrZS1wbmc=');
    expect(body.prompt).toContain('복합비료');
  });

  it('uses promptOverride verbatim when provided instead of the auto-built prompt', async () => {
    createClient.mockReturnValue(buildSupabaseStub());
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1wbmc=' }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const request = buildRequest({
      officeCode: 'OFF-1',
      mediumCategory: '복합비료',
      promptOverride: '파란색 톤으로, 논밭을 배경으로',
    });

    const response = await onRequestPost({ request, env: TEST_ENV });
    const body = await response.json();

    expect(body.prompt).toBe('파란색 톤으로, 논밭을 배경으로');
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe('파란색 톤으로, 논밭을 배경으로');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/category-image.test.js`
Expected: FAIL with "Cannot find module '../category-image'"

- [ ] **Step 3: Write minimal implementation**

```js
// react-app/functions/api/storefront-ai/category-image.js
import { requestOpenAiImage } from '../../lib/openAiImageRequest.js';
import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  withRequestErrorHandling,
  RequestValidationError,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';

const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'mediumCategory',
  'promptOverride',
  'representativeProductFields',
];

function toTrimmedStringLocal(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildDefaultPrompt(mediumCategory, representativeProductFields) {
  const spec = toTrimmedStringLocal(representativeProductFields?.spec);
  const nutrient = toTrimmedStringLocal(representativeProductFields?.nutrient);
  const detailParts = [spec, nutrient].filter(Boolean).join(', ');

  return [
    `농업용 ${mediumCategory} 제품의 깔끔한 스튜디오 컷 상품 사진 스타일 일러스트`,
    detailParts ? `(참고 정보: ${detailParts})` : '',
    '실제 브랜드 로고나 텍스트 없이',
  ]
    .filter(Boolean)
    .join(' ');
}

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request);
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);

  const mediumCategory = toTrimmedStringLocal(body.mediumCategory);

  if (!mediumCategory) {
    throw new RequestValidationError('mediumCategory is required.', 422);
  }

  await requireOwnedOffice({ request, env, officeCode });

  const promptOverride = toTrimmedStringLocal(body.promptOverride);
  const prompt = promptOverride || buildDefaultPrompt(mediumCategory, body.representativeProductFields);

  let imageResult;

  try {
    imageResult = await requestOpenAiImage(prompt, env.OPENAI_API_KEY);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'OpenAI image request failed.', 502);
  }

  return jsonResponse({
    mediumCategory,
    imageDataUri: imageResult.imageDataUri,
    prompt,
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run functions/api/storefront-ai/__tests__/category-image.test.js`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add react-app/functions/api/storefront-ai/category-image.js react-app/functions/api/storefront-ai/__tests__/category-image.test.js
git commit -m "feat(storefront-ai): add category-image generation endpoint"
```

---

## Task 3: `storefrontBuilderModel.js` — `generatedCategoryImages` 정규화/저장/로드

**Files:**
- Modify: `react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js`
- Test: `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js`

**Interfaces:**
- Produces: `normalizeGeneratedCategoryImages(value): Record<string, { imageDataUri: string, prompt: string, isAiGenerated: true, generatedAt: string }>` — exported, used internally and by Task 4/6.
- Modifies: `normalizeCategoryConfig()` return shape gains `generatedCategoryImages` (sibling of `cardDesign`).
- Modifies: `buildCategoryConfigRow({ ...existing params, generatedCategoryImages })` — new optional param, **merges** onto existing stored map (does not replace it) so generating one medium_category never wipes others.
- Modifies: `resolveCategoryDraft()` return shape gains `generatedCategoryImages`.
- Modifies: `buildStorefrontSavePayload({ ...existing params, generatedCategoryImages })` — new optional param threaded to `buildCategoryConfigRow()`.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js` (append new `describe` blocks; existing tests in this file are unaffected):

```js
import {
  normalizeGeneratedCategoryImages,
  // ...existing imports stay as-is, add the above
} from '../model/storefront-config/storefrontBuilderModel';

describe('normalizeGeneratedCategoryImages', () => {
  it('keeps a valid entry and stamps isAiGenerated true', () => {
    const result = normalizeGeneratedCategoryImages({
      복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', generatedAt: '2026-08-17T00:00:00.000Z' },
    });

    expect(result).toEqual({
      복합비료: {
        imageDataUri: 'data:image/png;base64,abc',
        prompt: 'x',
        isAiGenerated: true,
        generatedAt: '2026-08-17T00:00:00.000Z',
      },
    });
  });

  it('drops entries whose imageDataUri is not a data:image/ URI', () => {
    expect(
      normalizeGeneratedCategoryImages({ 복합비료: { imageDataUri: 'https://example.com/a.png' } }),
    ).toEqual({});
  });

  it('returns an empty object for non-object or missing input', () => {
    expect(normalizeGeneratedCategoryImages(undefined)).toEqual({});
    expect(normalizeGeneratedCategoryImages(null)).toEqual({});
    expect(normalizeGeneratedCategoryImages([])).toEqual({});
  });
});

describe('normalizeCategoryConfig generatedCategoryImages', () => {
  it('carries a valid generatedCategoryImages map through unchanged', () => {
    const config = normalizeCategoryConfig({
      generatedCategoryImages: {
        복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', generatedAt: '2026-08-17T00:00:00.000Z' },
      },
    });

    expect(config.generatedCategoryImages).toEqual({
      복합비료: {
        imageDataUri: 'data:image/png;base64,abc',
        prompt: 'x',
        isAiGenerated: true,
        generatedAt: '2026-08-17T00:00:00.000Z',
      },
    });
  });

  it('defaults to an empty object when absent', () => {
    expect(normalizeCategoryConfig({}).generatedCategoryImages).toEqual({});
  });
});

describe('buildCategoryConfigRow generatedCategoryImages merge', () => {
  it('merges a new entry onto the existing map instead of replacing it', () => {
    const existingConfig = {
      categoryConfigs: [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: {
            generatedCategoryImages: {
              유기질비료: { imageDataUri: 'data:image/png;base64,old', prompt: 'old', isAiGenerated: true, generatedAt: '2026-08-01T00:00:00.000Z' },
            },
          },
        },
      ],
    };

    const row = buildCategoryConfigRow({
      productCategoryName: 'Fertilizer Upload',
      existingConfig,
      selectedMediumCategories: ['복합비료', '유기질비료'],
      representativeMediumCategory: '복합비료',
      cardFields: ['product_name'],
      cardStyle: {},
      bodySlots: [],
      generatedCategoryImages: {
        복합비료: { imageDataUri: 'data:image/png;base64,new', prompt: 'new', generatedAt: '2026-08-17T00:00:00.000Z' },
      },
    });

    expect(Object.keys(row.categoryConfig.generatedCategoryImages).sort()).toEqual(['복합비료', '유기질비료']);
    expect(row.categoryConfig.generatedCategoryImages.유기질비료.imageDataUri).toBe('data:image/png;base64,old');
    expect(row.categoryConfig.generatedCategoryImages.복합비료.imageDataUri).toBe('data:image/png;base64,new');
  });
});

describe('resolveCategoryDraft generatedCategoryImages', () => {
  it('surfaces the saved generatedCategoryImages map', () => {
    const draft = resolveCategoryDraft({
      productCategoryName: 'Fertilizer Upload',
      productEntries: [{ categoryName: 'Fertilizer Upload', rows: [{ medium_category: '복합비료' }] }],
      existingConfig: {
        categoryConfigs: [
          {
            productCategoryName: 'Fertilizer Upload',
            categoryConfig: {
              generatedCategoryImages: {
                복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', generatedAt: '2026-08-17T00:00:00.000Z' },
              },
            },
          },
        ],
      },
    });

    expect(draft.generatedCategoryImages.복합비료.imageDataUri).toBe('data:image/png;base64,abc');
  });
});

describe('buildStorefrontSavePayload generatedCategoryImages', () => {
  it('threads generatedCategoryImages into the saved category row', () => {
    const payload = buildStorefrontSavePayload({
      officeCode: 'OFF-1',
      existingConfig: null,
      hiddenProducts: [],
      selectedProductCategoryName: 'Fertilizer Upload',
      selectedMediumCategories: ['복합비료'],
      representativeMediumCategory: '복합비료',
      cardStyle: {},
      cardFields: ['product_name'],
      navConfig: {},
      mobileUiTree: [],
      generatedCategoryImages: {
        복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', generatedAt: '2026-08-17T00:00:00.000Z' },
      },
    });

    expect(
      payload.categoryConfigs[0].categoryConfig.generatedCategoryImages.복합비료.imageDataUri,
    ).toBe('data:image/png;base64,abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: FAIL — `normalizeGeneratedCategoryImages` is not exported / `generatedCategoryImages` is `undefined` on returned objects.

- [ ] **Step 3: Write minimal implementation**

In `react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js`:

Add after `normalizeMediumCategory`/`uniqueStrings` helpers (around line 185):

```js
export function normalizeGeneratedCategoryImages(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};

  Object.keys(source).forEach((mediumCategory) => {
    const entry = source[mediumCategory];
    const imageDataUri = typeof entry?.imageDataUri === 'string' ? entry.imageDataUri : '';

    if (!imageDataUri.startsWith('data:image/')) {
      return;
    }

    result[mediumCategory] = {
      imageDataUri,
      prompt: typeof entry?.prompt === 'string' ? entry.prompt : '',
      isAiGenerated: true,
      generatedAt: typeof entry?.generatedAt === 'string' ? entry.generatedAt : new Date().toISOString(),
    };
  });

  return result;
}
```

Modify `normalizeCategoryConfig()` (around line 271) — add one line to the returned object:

```js
export function normalizeCategoryConfig(categoryConfig, productCategoryName = '', allowedScalarKeys) {
  const source = categoryConfig ?? {};
  // ...existing body unchanged...

  return {
    schemaVersion: Number.isFinite(source.schemaVersion) ? source.schemaVersion : 1,
    displayName: toTrimmedString(source.displayName) || toTrimmedString(productCategoryName),
    sourceCategoryName:
      toTrimmedString(source.sourceCategoryName) || toTrimmedString(productCategoryName),
    selectedMediumCategories,
    representativeMediumCategory:
      representativeMediumCategory && selectedMediumCategories.includes(representativeMediumCategory)
        ? representativeMediumCategory
        : selectedMediumCategories[0] || '',
    cardDesign: {
      visibleFields: normalizedCardFields,
      cardStyle: normalizedCardStyle,
      bodySlots,
    },
    generatedCategoryImages: normalizeGeneratedCategoryImages(source.generatedCategoryImages),
  };
}
```

Modify `buildCategoryConfigRow()` (around line 373) — add param and merge:

```js
export function buildCategoryConfigRow({
  productCategoryName,
  existingConfig,
  selectedMediumCategories,
  representativeMediumCategory,
  cardFields,
  cardStyle,
  bodySlots,
  allowedScalarKeys,
  generatedCategoryImages,
}) {
  const normalizedProductCategoryName = toTrimmedString(productCategoryName);
  const existingRow = findCategoryConfigRow(existingConfig?.categoryConfigs, normalizedProductCategoryName);
  const nextCategoryConfig = normalizeCategoryConfig(
    {
      ...(existingRow?.categoryConfig ?? {}),
      displayName: normalizedProductCategoryName,
      sourceCategoryName: normalizedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      cardDesign: {
        visibleFields: cardFields,
        cardStyle,
        bodySlots,
      },
      generatedCategoryImages: {
        ...normalizeGeneratedCategoryImages(existingRow?.categoryConfig?.generatedCategoryImages),
        ...normalizeGeneratedCategoryImages(generatedCategoryImages),
      },
    },
    normalizedProductCategoryName,
    allowedScalarKeys,
  );

  return {
    productCategoryName: normalizedProductCategoryName,
    categoryConfig: nextCategoryConfig,
  };
}
```

Modify `resolveCategoryDraft()` (around line 342) — add to the returned object:

```js
  return {
    entry: entry ?? null,
    mediumCategoryOptions,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(existingCategoryConfig.cardDesign.visibleFields, effectiveScalarKeys),
    cardStyle: normalizeCardStyle(existingCategoryConfig.cardDesign.cardStyle),
    bodySlots: existingCategoryConfig.cardDesign.bodySlots,
    generatedCategoryImages: existingCategoryConfig.generatedCategoryImages,
  };
```

Modify `buildStorefrontSavePayload()` (around line 438) — add param and thread it through:

```js
export function buildStorefrontSavePayload({
  officeCode,
  existingConfig,
  hiddenProducts,
  selectedProductCategoryName,
  selectedMediumCategories,
  representativeMediumCategory,
  cardStyle,
  cardFields,
  bodySlots,
  navConfig,
  mobileUiTree,
  pageStyle,
  allowedScalarKeys,
  generatedCategoryImages,
}) {
  // ...existing body unchanged up to nextCategoryRow...
  const nextCategoryRow = buildCategoryConfigRow({
    productCategoryName: selectedProductCategoryName,
    existingConfig,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields: normalizeCardFields(cardFields, allowedScalarKeys),
    cardStyle: normalizeCardStyle(cardStyle),
    bodySlots,
    allowedScalarKeys,
    generatedCategoryImages,
  });
  // ...rest unchanged...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/storefrontBuilderModel.test.js`
Expected: PASS (all existing + new cases)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/storefront-config/storefrontBuilderModel.js react-app/src/features/storefront/__tests__/storefrontBuilderModel.test.js
git commit -m "feat(storefront): store generatedCategoryImages per medium_category in category_config"
```

---

## Task 4: `sectionMatching.js` — 공개 페이지 섹션에 이미지 맵 전달

**Files:**
- Modify: `react-app/src/features/storefront/model/storefront-config/sectionMatching.js`
- Test: `react-app/src/features/storefront/__tests__/sectionMatching.test.js` (신규 파일)

**Interfaces:**
- Consumes: `categoryConfig.generatedCategoryImages` (from Task 3's `normalizeCategoryConfig()` shape).
- Modifies: `buildSections()` output — each section object gains `generatedCategoryImages`. Task 7 (`CardGridSection.jsx`) reads `section.generatedCategoryImages`.

- [ ] **Step 1: Write the failing test**

```js
// react-app/src/features/storefront/__tests__/sectionMatching.test.js
import { describe, expect, it } from 'vitest';

import { buildSections } from '../model/storefront-config/sectionMatching';

describe('buildSections generatedCategoryImages', () => {
  it('carries the category config generatedCategoryImages map onto the section', () => {
    const sections = buildSections(
      [
        {
          productCategoryName: 'Fertilizer Upload',
          categoryConfig: {
            displayName: 'Fertilizer Upload',
            generatedCategoryImages: {
              복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', isAiGenerated: true, generatedAt: '2026-08-17T00:00:00.000Z' },
            },
          },
        },
      ],
      [{ product_category_name: 'Fertilizer Upload', product_name: 'Alpha', medium_category: '복합비료' }],
    );

    expect(sections[0].generatedCategoryImages).toEqual({
      복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', isAiGenerated: true, generatedAt: '2026-08-17T00:00:00.000Z' },
    });
  });

  it('defaults to an empty object when the category config has none', () => {
    const sections = buildSections(
      [{ productCategoryName: 'Fertilizer Upload', categoryConfig: { displayName: 'Fertilizer Upload' } }],
      [{ product_category_name: 'Fertilizer Upload', product_name: 'Alpha' }],
    );

    expect(sections[0].generatedCategoryImages).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/sectionMatching.test.js`
Expected: FAIL — `sections[0].generatedCategoryImages` is `undefined`

- [ ] **Step 3: Write minimal implementation**

In `react-app/src/features/storefront/model/storefront-config/sectionMatching.js`, modify `buildSections()`:

```js
export function buildSections(categoryConfigs, productRows) {
  const rows = Array.isArray(productRows) ? productRows : [];

  return (Array.isArray(categoryConfigs) ? categoryConfigs : [])
    .map((categoryConfigRow) => {
      const categoryConfig = categoryConfigRow?.categoryConfig ?? {};
      const products = rows.filter((row) => matchesCategoryConfig(row, categoryConfigRow));

      return {
        title: categoryConfig.displayName || categoryConfigRow?.productCategoryName || 'Products',
        productCategoryName: categoryConfigRow?.productCategoryName || '',
        fields: categoryConfig.cardDesign?.visibleFields,
        cardStyle: categoryConfig.cardDesign?.cardStyle,
        bodySlots: categoryConfig.cardDesign?.bodySlots,
        representativeMediumCategory: categoryConfig.representativeMediumCategory || '',
        generatedCategoryImages: categoryConfig.generatedCategoryImages || {},
        products,
      };
    })
    .filter((section) => section.products.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/sectionMatching.test.js`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/model/storefront-config/sectionMatching.js react-app/src/features/storefront/__tests__/sectionMatching.test.js
git commit -m "feat(storefront): expose generatedCategoryImages on built sections"
```

---

## Task 5: 프론트엔드 게이트웨이 (`categoryImageGateway.js`)

**Files:**
- Create: `react-app/src/features/storefront/services/card-design/categoryImageGateway.js`
- Test: `react-app/src/features/storefront/__tests__/categoryImageGateway.test.js`

**Interfaces:**
- Produces: `postCategoryImageRequest(requestBody: { officeCode, mediumCategory, promptOverride?, representativeProductFields? }): Promise<{ mediumCategory, imageDataUri, prompt }>` — Task 6 (`useCardAiDesign.js`) calls this.

- [ ] **Step 1: Write the failing test**

```js
// react-app/src/features/storefront/__tests__/categoryImageGateway.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';

import { postCategoryImageRequest } from '../services/card-design/categoryImageGateway';

vi.mock('../../../lib/supabaseClient', () => ({
  default: { auth: { getSession: vi.fn() } },
}));

import supabase from '../../../lib/supabaseClient';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('postCategoryImageRequest', () => {
  it('throws a clear error when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(postCategoryImageRequest({ officeCode: 'OFF-1', mediumCategory: '복합비료' })).rejects.toThrow(
      '로그인 정보가 만료되었습니다',
    );
  });

  it('posts the request body as-is with the bearer token and returns the parsed response', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    const responseBody = { mediumCategory: '복합비료', imageDataUri: 'data:image/png;base64,abc', prompt: 'x' };
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => responseBody });
    vi.stubGlobal('fetch', fetchSpy);

    const requestBody = { officeCode: 'OFF-1', mediumCategory: '복합비료' };
    const result = await postCategoryImageRequest(requestBody);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/storefront-ai/category-image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody),
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it('throws with the server error message when the response is not ok', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'officeCode mismatch.' }) }),
    );

    await expect(postCategoryImageRequest({ officeCode: 'OFF-2', mediumCategory: 'x' })).rejects.toThrow(
      'officeCode mismatch.',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryImageGateway.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// react-app/src/features/storefront/services/card-design/categoryImageGateway.js
import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';

const CATEGORY_IMAGE_ENDPOINT = '/api/storefront-ai/category-image';
const SESSION_EXPIRED_ERROR_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return toTrimmedString(body?.error) || `Storefront AI request failed with status ${response.status}.`;
  } catch {
    return `Storefront AI request failed with status ${response.status}.`;
  }
}

export async function postCategoryImageRequest(requestBody) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(SESSION_EXPIRED_ERROR_MESSAGE);
  }

  const response = await fetch(CATEGORY_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/categoryImageGateway.test.js`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/services/card-design/categoryImageGateway.js react-app/src/features/storefront/__tests__/categoryImageGateway.test.js
git commit -m "feat(storefront): add category-image gateway client"
```

---

## Task 6: 상태 배관 — `useCardAiDesign.js` + `useStorefrontBuilder.js`

**Files:**
- Modify: `react-app/src/features/storefront/hooks/useCardAiDesign.js`
- Modify: `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`
- Test: `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`

**Interfaces:**
- Consumes: `postCategoryImageRequest` from Task 5.
- Consumes: `resolveCategoryDraft(...).generatedCategoryImages`, `buildStorefrontSavePayload({ ..., generatedCategoryImages })` from Task 3.
- Produces (from `useCardAiDesign`): `generatedCategoryImages: Record<string, entry>`, `isGeneratingCategoryImage: Record<string, boolean>`, `generateCategoryImage(mediumCategory: string, options?: { promptOverride?: string, representativeProductFields?: object }): Promise<{ ok: boolean, error?: string }>`. `hydrateCardStyle(nextCardStyle, nextBodySlots = [], nextGeneratedCategoryImages = {})` — third param added.
- Produces (from `useStorefrontBuilder` return value, extends existing `cardMode`): `cardMode.mediumCategories: string[]`, `cardMode.generatedCategoryImages`, `cardMode.isGeneratingCategoryImage`, `cardMode.generateCategoryImage`. Task 8 (`CategoryImageGenPanel.jsx`) consumes these four.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/useCardAiDesign.test.js`:

```js
import { postCategoryImageRequest } from '../services/card-design/categoryImageGateway';

vi.mock('../services/card-design/categoryImageGateway', () => ({ postCategoryImageRequest: vi.fn() }));

// ...inside the existing describe('useCardAiDesign', ...) block, add:

it('starts with an empty generatedCategoryImages map', () => {
  const { result } = renderHook(() => useCardAiDesign());

  expect(result.current.generatedCategoryImages).toEqual({});
});

it('hydrateCardStyle accepts and stores a generatedCategoryImages map as its third argument', () => {
  const { result } = renderHook(() => useCardAiDesign());
  const stored = { 복합비료: { imageDataUri: 'data:image/png;base64,abc', prompt: 'x', isAiGenerated: true, generatedAt: '2026-08-17T00:00:00.000Z' } };

  act(() => result.current.hydrateCardStyle(DEFAULT_CARD_STYLE, [], stored));

  expect(result.current.generatedCategoryImages).toEqual(stored);
});

it('generateCategoryImage calls the gateway, stores the result keyed by mediumCategory, and toggles the in-flight flag', async () => {
  let resolveRequest;
  postCategoryImageRequest.mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
  );

  const { result } = renderHook(() => useCardAiDesign({ officeCode: 'OFF-1' }));

  let pendingCall;
  act(() => {
    pendingCall = result.current.generateCategoryImage('복합비료', { promptOverride: '' });
  });

  expect(result.current.isGeneratingCategoryImage.복합비료).toBe(true);

  await act(async () => {
    resolveRequest({ mediumCategory: '복합비료', imageDataUri: 'data:image/png;base64,abc', prompt: '자동 프롬프트' });
    await pendingCall;
  });

  expect(postCategoryImageRequest).toHaveBeenCalledWith(
    expect.objectContaining({ officeCode: 'OFF-1', mediumCategory: '복합비료' }),
  );
  expect(result.current.generatedCategoryImages.복합비료).toEqual({
    imageDataUri: 'data:image/png;base64,abc',
    prompt: '자동 프롬프트',
    isAiGenerated: true,
    generatedAt: expect.any(String),
  });
  expect(result.current.isGeneratingCategoryImage.복합비료).toBe(false);
});

it('generateCategoryImage surfaces the error and clears the in-flight flag on failure', async () => {
  postCategoryImageRequest.mockRejectedValue(new Error('network down'));

  const { result } = renderHook(() => useCardAiDesign());

  let outcome;
  await act(async () => {
    outcome = await result.current.generateCategoryImage('복합비료');
  });

  expect(outcome).toEqual({ ok: false, error: 'network down' });
  expect(result.current.isGeneratingCategoryImage.복합비료).toBe(false);
  expect(result.current.generatedCategoryImages.복합비료).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/useCardAiDesign.test.js`
Expected: FAIL — `result.current.generatedCategoryImages` / `generateCategoryImage` are `undefined`

- [ ] **Step 3: Write minimal implementation**

In `react-app/src/features/storefront/hooks/useCardAiDesign.js`, add the import and new state near the top of `useCardAiDesign()`:

```js
import { postCategoryImageRequest } from '../services/card-design/categoryImageGateway';
```

```js
export function useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots = [] } = {}) {
  const [cardStyle, setCardStyle] = useState(() => normalizeCardStyle(initialCardStyle));
  const [bodySlots, setBodySlots] = useState(initialBodySlots);
  const [generatedCategoryImages, setGeneratedCategoryImages] = useState({});
  const [isGeneratingCategoryImage, setIsGeneratingCategoryImage] = useState({});
  // ...existing state unchanged...
```

Modify `hydrateCardStyle` to accept and store the third argument:

```js
  function hydrateCardStyle(nextCardStyle, nextBodySlots = [], nextGeneratedCategoryImages = {}) {
    setCardStyle(normalizeCardStyle(nextCardStyle));
    setBodySlots(nextBodySlots);
    setGeneratedCategoryImages(nextGeneratedCategoryImages);
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
    setCardAiMessages([]);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');
    setLastCardAiSnapshot(null);
  }
```

Add a new function after `undoLastCardAiDesign()` (before `discardCardAiDesignSession()`):

```js
  async function generateCategoryImage(mediumCategory, { promptOverride, representativeProductFields } = {}) {
    setIsGeneratingCategoryImage((current) => ({ ...current, [mediumCategory]: true }));

    try {
      const result = await postCategoryImageRequest({
        officeCode,
        mediumCategory,
        promptOverride: promptOverride || '',
        representativeProductFields: representativeProductFields ?? {},
      });

      setGeneratedCategoryImages((current) => ({
        ...current,
        [mediumCategory]: {
          imageDataUri: result.imageDataUri,
          prompt: result.prompt,
          isAiGenerated: true,
          generatedAt: new Date().toISOString(),
        },
      }));

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '이미지를 생성하지 못했습니다.';

      return { ok: false, error: message };
    } finally {
      setIsGeneratingCategoryImage((current) => ({ ...current, [mediumCategory]: false }));
    }
  }
```

Add both to the returned object at the bottom:

```js
  return {
    cardStyle,
    bodySlots,
    generatedCategoryImages,
    isGeneratingCategoryImage,
    cardAiDesign,
    cardAiMessages,
    isApplyingCardAiDesign,
    cardAiErrorMessage,
    canUndoCardAiDesign: Boolean(lastCardAiSnapshot),
    hydrateCardStyle,
    setCardsPerRow,
    setPrompt,
    setTargetScope,
    applyCardAiDesign,
    undoLastCardAiDesign,
    discardCardAiDesignSession,
    generateCategoryImage,
  };
```

In `react-app/src/features/storefront/hooks/useStorefrontBuilder.js`, thread `generatedCategoryImages` through the five points that already thread `bodySlots`:

1. `captureCardModeDraft()`:

```js
  function captureCardModeDraft() {
    const baseline = {
      cardStyle: cloneValue(cardAi.cardStyle),
      bodySlots: cloneValue(cardAi.bodySlots),
      generatedCategoryImages: cloneValue(cardAi.generatedCategoryImages),
    };

    cardModeDraftRef.current = baseline;
    setComposerApplyPending('card', false);
    cardAi.hydrateCardStyle(baseline.cardStyle, baseline.bodySlots, baseline.generatedCategoryImages);
  }
```

2. `hydrateCategoryDraft()`:

```js
  function hydrateCategoryDraft(
    categoryName,
    nextProductEntries,
    nextExistingConfig,
  ) {
    const resolvedCategoryName = categoryName || '';
    const resolvedDraft = resolveCategoryDraft({
      productCategoryName: resolvedCategoryName,
      productEntries: nextProductEntries,
      existingConfig: nextExistingConfig,
    });

    setSelectedProductCategoryName(resolvedCategoryName);
    setSelectedMediumCategories(resolvedDraft.selectedMediumCategories);
    setRepresentativeMediumCategory(resolvedDraft.representativeMediumCategory);
    dataSelection.reset(
      resolvedDraft.cardFields,
      deriveEffectiveScalarKeys(resolvedDraft.entry?.rows),
    );
    cardAi.hydrateCardStyle(resolvedDraft.cardStyle, resolvedDraft.bodySlots, resolvedDraft.generatedCategoryImages);
    cardModeDraftRef.current = {
      cardStyle: cloneValue(resolvedDraft.cardStyle),
      bodySlots: cloneValue(resolvedDraft.bodySlots),
      generatedCategoryImages: cloneValue(resolvedDraft.generatedCategoryImages),
    };
  }
```

3. `buildCurrentSavePayload()`:

```js
  function buildCurrentSavePayload({ cardFields = dataSelection.committed } = {}) {
    return buildStorefrontSavePayload({
      officeCode,
      existingConfig,
      hiddenProducts,
      selectedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      cardStyle: cardAi.cardStyle,
      cardFields,
      bodySlots: cardAi.bodySlots,
      navConfig,
      mobileUiTree,
      pageStyle: pageAi.pageStyle,
      allowedScalarKeys: effectiveScalarKeys,
      generatedCategoryImages: cardAi.generatedCategoryImages,
    });
  }
```

4. `discardCurrentModeDraft()`:

```js
    if ((mode === "card" || mode === "autoDesign") && cardModeDraftRef.current) {
      cardAi.hydrateCardStyle(
        cardModeDraftRef.current.cardStyle,
        cardModeDraftRef.current.bodySlots,
        cardModeDraftRef.current.generatedCategoryImages,
      );
      cardModeDraftRef.current = null;
    }
```

5. `buildPreviewConfig()`:

```js
  function buildPreviewConfig(cardFields) {
    return selectedProductCategoryName
      ? buildStorefrontSavePayload({
          officeCode,
          existingConfig,
          hiddenProducts,
          selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardStyle: cardAi.cardStyle,
          cardFields,
          bodySlots: previewBodySlots,
          navConfig,
          mobileUiTree,
          pageStyle: pageAi.pageStyle,
          allowedScalarKeys: effectiveScalarKeys,
          generatedCategoryImages: cardAi.generatedCategoryImages,
        })
      : {
          // ...unchanged fallback branch...
        };
  }
```

Extend `cardMode` (near the bottom, where it's currently defined):

```js
  const cardMode = {
    categoryTabs: dataMode.categoryTabs,
    selectedCategoryId: dataMode.selectedCategoryId,
    selectCategory: dataMode.selectCategory,
    mediumCategories: selectedMediumCategories,
    generatedCategoryImages: cardAi.generatedCategoryImages,
    isGeneratingCategoryImage: cardAi.isGeneratingCategoryImage,
    generateCategoryImage: (mediumCategory, options) =>
      cardAi.generateCategoryImage(mediumCategory, {
        ...options,
        representativeProductFields: (() => {
          const representativeRow = (currentEntry?.rows ?? []).find(
            (row) => row?.medium_category === mediumCategory,
          );

          return { spec: representativeRow?.spec, nutrient: representativeRow?.nutrient };
        })(),
      }),
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/useCardAiDesign.test.js`
Expected: PASS (existing + 4 new cases)

Also run the broader storefront builder test to confirm nothing regressed:

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS (no changes to this file yet — confirms Task 6's `useStorefrontBuilder.js` edits didn't break existing flows)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/hooks/useCardAiDesign.js react-app/src/features/storefront/hooks/useStorefrontBuilder.js react-app/src/features/storefront/__tests__/useCardAiDesign.test.js
git commit -m "feat(storefront): wire generatedCategoryImages through card-design state"
```

---

## Task 7: 카드에 fallback 이미지 + "AI 생성 이미지" 배지 렌더링

**Files:**
- Modify: `react-app/src/features/storefront/components/CardGridSection.jsx`
- Modify: `react-app/src/features/storefront/components/card-grid-section/CardImageSection.jsx`
- Modify: `react-app/src/features/storefront/components/CardGridSection.module.css`
- Test: `react-app/src/features/storefront/__tests__/CardGridSection.test.jsx`

**Interfaces:**
- Consumes: `section.generatedCategoryImages` (from Task 4).
- Modifies: `CardImageSection` props — adds `imageSrc` (replaces reading `product.img_url` directly) and `isAiGenerated`.

- [ ] **Step 1: Write the failing test**

Add to `react-app/src/features/storefront/__tests__/CardGridSection.test.jsx` (new `describe` block, existing `conditionalStyles` tests untouched):

```js
describe('CardGridSection generatedCategoryImages fallback', () => {
  it('renders the generated image and an AI badge for a product with no img_url', () => {
    render(
      <CardGridSection
        section={{
          products: [{ row_id: 'p1', product_name: '무이미지 상품', medium_category: '복합비료' }],
          generatedCategoryImages: {
            복합비료: { imageDataUri: 'data:image/png;base64,abc', isAiGenerated: true },
          },
        }}
        fields={['product_name', 'img_url']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-fallback"
      />,
    );

    const image = screen.getByRole('img', { name: '무이미지 상품' });
    expect(image).toHaveAttribute('src', 'data:image/png;base64,abc');
    expect(screen.getByText('AI 생성 이미지')).toBeInTheDocument();
  });

  it('prefers the real img_url over the generated fallback and shows no badge when img_url is present', () => {
    render(
      <CardGridSection
        section={{
          products: [
            { row_id: 'p2', product_name: '실제 이미지 상품', medium_category: '복합비료', img_url: 'https://example.com/real.png' },
          ],
          generatedCategoryImages: {
            복합비료: { imageDataUri: 'data:image/png;base64,abc', isAiGenerated: true },
          },
        }}
        fields={['product_name', 'img_url']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-real"
      />,
    );

    const image = screen.getByRole('img', { name: '실제 이미지 상품' });
    expect(image).toHaveAttribute('src', 'https://example.com/real.png');
    expect(screen.queryByText('AI 생성 이미지')).not.toBeInTheDocument();
  });

  it('renders no image section when neither img_url nor a matching generated image exists', () => {
    render(
      <CardGridSection
        section={{
          products: [{ row_id: 'p3', product_name: '무이미지·무생성 상품', medium_category: '유기질비료' }],
          generatedCategoryImages: {
            복합비료: { imageDataUri: 'data:image/png;base64,abc', isAiGenerated: true },
          },
        }}
        fields={['product_name', 'img_url']}
        cardStyle={DEFAULT_CARD_STYLE}
        sectionId="test-section-image-none"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CardGridSection.test.jsx`
Expected: FAIL — no `img` role found for the fallback case; badge text not found

- [ ] **Step 3: Write minimal implementation**

In `react-app/src/features/storefront/components/CardGridSection.jsx`, inside the `products.map((product, index) => { ... })` callback, replace the `hasImage` calculation and the `image:` entry in `sectionNodes`:

```js
          const generatedImageForProduct =
            section?.generatedCategoryImages?.[product?.medium_category] ?? null;
          const resolvedImageSrc = product?.img_url || generatedImageForProduct?.imageDataUri || '';
          const isAiGeneratedImage = !product?.img_url && Boolean(generatedImageForProduct);
          const hasImage =
            visibleFields.includes('img_url') &&
            Boolean(resolvedImageSrc) &&
            sectionOrder.includes('image');
```

```js
            image: hasImage ? (
              <CardImageSection
                key="image"
                product={product}
                imageSrc={resolvedImageSrc}
                isAiGenerated={isAiGeneratedImage}
                cardStyle={resolvedStyle}
                fitOverride={activeConditionalStyle?.image?.fit}
              />
            ) : null,
```

In `react-app/src/features/storefront/components/card-grid-section/CardImageSection.jsx`, replace the whole component body:

```jsx
import styles from '../CardGridSection.module.css';

export default function CardImageSection({ product, imageSrc, isAiGenerated, cardStyle, fitOverride }) {
  return (
    <div className={styles.cardImageWrap}>
      <img
        className={styles.cardImage}
        src={imageSrc}
        alt={product?.product_name || ''}
        style={{ objectFit: fitOverride || cardStyle.image.fit }}
      />
      {isAiGenerated ? <span className={styles.aiGeneratedBadge}>AI 생성 이미지</span> : null}
    </div>
  );
}
```

In `react-app/src/features/storefront/components/CardGridSection.module.css`, the existing `.cardImageWrap` rule (line 141-143) is:

```css
.cardImageWrap {
  padding: 14px 14px 0;
}
```

Add one line to that existing rule so the badge below can position against it:

```css
.cardImageWrap {
  position: relative;
  padding: 14px 14px 0;
}
```

Then add a new rule anywhere in the file for the badge itself:

```css
.aiGeneratedBadge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.72);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CardGridSection.test.jsx`
Expected: PASS (existing conditionalStyles cases + 3 new cases)

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/CardGridSection.jsx react-app/src/features/storefront/components/card-grid-section/CardImageSection.jsx react-app/src/features/storefront/components/CardGridSection.module.css react-app/src/features/storefront/__tests__/CardGridSection.test.jsx
git commit -m "feat(storefront): render generated fallback image with AI badge on cards"
```

---

## Task 8: 트리거 UI — `CategoryImageGenPanel`

**Files:**
- Create: `react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.jsx`
- Create: `react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.module.css`
- Modify: `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx`
- Modify: `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`
- Test: `react-app/src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx`

**Interfaces:**
- Consumes: `cardMode.mediumCategories`, `cardMode.generatedCategoryImages`, `cardMode.isGeneratingCategoryImage`, `cardMode.generateCategoryImage` (all from Task 6).
- Scope decision: only rendered when `session.mode === 'card'` (not `'autoDesign'`) — keeps MVP surface area to exactly what the spec's Next Steps called out; `autoDesign` wiring is out of scope for this plan.

- [ ] **Step 1: Write the failing test**

```jsx
// react-app/src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CategoryImageGenPanel from '../components/chat-workspace/CategoryImageGenPanel';

describe('CategoryImageGenPanel', () => {
  it('renders one row per medium category with a generate button', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료', '유기질비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{}}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '복합비료 이미지 생성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '유기질비료 이미지 생성' })).toBeInTheDocument();
  });

  it('calls onGenerate with the medium category and the typed override prompt', async () => {
    const onGenerate = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{}}
        onGenerate={onGenerate}
      />,
    );

    await user.type(screen.getByLabelText('복합비료 이미지 요청'), '파란 톤으로');
    await user.click(screen.getByRole('button', { name: '복합비료 이미지 생성' }));

    expect(onGenerate).toHaveBeenCalledWith('복합비료', { promptOverride: '파란 톤으로' });
  });

  it('disables the button and shows a generating label while in flight', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{}}
        isGeneratingCategoryImage={{ 복합비료: true }}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  it('shows a thumbnail preview once a generated image exists for the category', () => {
    render(
      <CategoryImageGenPanel
        mediumCategories={['복합비료']}
        generatedCategoryImages={{ 복합비료: { imageDataUri: 'data:image/png;base64,abc', isAiGenerated: true } }}
        isGeneratingCategoryImage={{}}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: '복합비료 생성 이미지 미리보기' })).toHaveAttribute(
      'src',
      'data:image/png;base64,abc',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```jsx
// react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.jsx
import { useState } from 'react';

import styles from './CategoryImageGenPanel.module.css';

export default function CategoryImageGenPanel({
  mediumCategories,
  generatedCategoryImages,
  isGeneratingCategoryImage,
  onGenerate,
}) {
  const [promptDrafts, setPromptDrafts] = useState({});

  if (!Array.isArray(mediumCategories) || mediumCategories.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel} data-testid="storefront-category-image-gen-panel">
      <p className={styles.label}>중분류별 AI 대체 이미지</p>
      <ul className={styles.list}>
        {mediumCategories.map((mediumCategory) => {
          const generated = generatedCategoryImages?.[mediumCategory];
          const isGenerating = Boolean(isGeneratingCategoryImage?.[mediumCategory]);
          const inputId = `category-image-prompt-${mediumCategory}`;

          return (
            <li key={mediumCategory} className={styles.row}>
              {generated ? (
                <img
                  className={styles.thumbnail}
                  src={generated.imageDataUri}
                  alt={`${mediumCategory} 생성 이미지 미리보기`}
                />
              ) : null}
              <div className={styles.rowMain}>
                <span className={styles.categoryName}>{mediumCategory}</span>
                <label className={styles.promptLabel} htmlFor={inputId}>
                  {`${mediumCategory} 이미지 요청`}
                </label>
                <input
                  id={inputId}
                  className={styles.promptInput}
                  type="text"
                  placeholder="비워두면 자동으로 요청합니다"
                  value={promptDrafts[mediumCategory] ?? ''}
                  onChange={(event) =>
                    setPromptDrafts((current) => ({ ...current, [mediumCategory]: event.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                className={styles.generateButton}
                disabled={isGenerating}
                onClick={() =>
                  onGenerate(mediumCategory, { promptOverride: promptDrafts[mediumCategory] ?? '' })
                }
              >
                {isGenerating ? '생성 중...' : `${mediumCategory} 이미지 생성`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

```css
/* react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.module.css */
.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
}

.label {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
}

.thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.rowMain {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.categoryName {
  font-size: 0.82rem;
  font-weight: 700;
  color: #111827;
}

.promptLabel {
  font-size: 0.68rem;
  color: #6b7280;
}

.promptInput {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  font-size: 0.78rem;
}

.generateButton {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #1d4a2e, #163622);
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.generateButton:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
```

In `react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx`, add the import and render it above the `<form>`, gated on a new `categoryImageMode` prop:

```jsx
import CategoryImageGenPanel from './CategoryImageGenPanel';
```

```jsx
export default function ChatComposerDock({ mode, composer, categoryTabsMode, categoryImageMode }) {
  // ...unchanged copy/handleSubmit...

  return (
    <section className={styles.dock} data-testid="storefront-chat-composer-dock">
      {/* ...unchanged header, categoryTabsWrap, targetBubbleWrap... */}

      {categoryImageMode ? (
        <CategoryImageGenPanel
          mediumCategories={categoryImageMode.mediumCategories}
          generatedCategoryImages={categoryImageMode.generatedCategoryImages}
          isGeneratingCategoryImage={categoryImageMode.isGeneratingCategoryImage}
          onGenerate={categoryImageMode.generateCategoryImage}
        />
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* ...unchanged... */}
      </form>
    </section>
  );
}
```

In `react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx`, pass the new prop:

```jsx
          <ChatComposerDock
            mode={session.mode}
            composer={composerMode}
            categoryTabsMode={showCategoryTabs ? cardMode : null}
            categoryImageMode={session.mode === 'card' ? cardMode : null}
          />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx`
Expected: PASS (4/4)

Also confirm the composer dock and workspace still pass with the new prop wired in:

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontBuilderPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.jsx react-app/src/features/storefront/components/chat-workspace/CategoryImageGenPanel.module.css react-app/src/features/storefront/components/chat-workspace/ChatComposerDock.jsx react-app/src/features/storefront/components/chat-workspace/StorefrontChatWorkspace.jsx react-app/src/features/storefront/__tests__/CategoryImageGenPanel.test.jsx
git commit -m "feat(storefront): add per-medium-category AI image generation trigger UI"
```

---

## Task 9: End-to-end 확인 (수동 스파이크)

**Files:** none (no code changes — verification only)

- [ ] **Step 1: 실제 OpenAI 계정으로 모델 슬러그/응답 형태 확정**

`react-app/functions/lib/openAiImageRequest.js`의 `DEFAULT_IMAGE_MODEL`이 실제 계정에서 유효한지, `response_format: 'b64_json'`이 그대로 지원되는지 1회 수동 호출로 확인. 스펙 Open Questions #1에서 이미 플래그된 항목 — 다르면 Task 1의 `DEFAULT_IMAGE_MODEL`/요청 바디만 수정(테스트는 mock이라 영향 없음).

- [ ] **Step 2: 로컬에서 전체 플로우 수동 확인**

1. `cd react-app && npm run dev` (또는 기존 로컬 개발 명령)로 스토어프론트 빌더 실행
2. `img_url` 없는 상품이 섞인 엑셀을 업로드한 오피스로 로그인
3. "카드 디자인" 모드 진입 → `CategoryImageGenPanel`에서 임의 중분류의 "이미지 생성" 버튼 클릭
4. 생성 완료 후 미리보기 카드에 이미지 + "AI 생성 이미지" 배지가 뜨는지 확인
5. "저장하기" 클릭 → 새로고침 → 같은 이미지/배지가 유지되는지 확인 (영속화 검증)
6. 자유 텍스트로 같은 중분류를 다시 요청 → 이미지가 교체되는지 확인

- [ ] **Step 3: 전체 테스트 스위트 실행**

Run: `cd react-app && npx vitest run`
Expected: PASS (모든 기존 + 신규 테스트)

- [ ] **Step 4: Commit (필요 시 스파이크로 발견된 수정 사항만)**

```bash
git add -A
git commit -m "chore(storefront-ai): finalize image model config from live spike"
```

(스파이크 결과 수정이 없으면 이 커밋은 생략)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-17-category-image-generation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트를 붙여 구현, 태스크 사이 리뷰, 빠른 반복
2. **Inline Execution** — 이 세션 안에서 executing-plans로 배치 실행, 체크포인트마다 리뷰

**Which approach?**
