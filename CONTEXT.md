# Storefront

영업점(office)이 자기 상품 데이터를 골라 공개 판매 페이지를 만들고, 손님이 그 페이지를 보는 맥락.

## Language

### 모듈

**Storefront view**:
Storefront config와 상품 행을 받아 완성된 페이지를 그리는 순수 렌더링 모듈. I/O를 하지 않는다. 빌더의 미리보기와 공개 페이지가 같은 화면인 이유가 이 모듈이 하나이기 때문이다.
_Avoid_: 렌더러, 프리뷰 컴포넌트, StorefrontView 컴포넌트

**Storefront builder**:
영업점이 표시할 필드를 고르고 AI로 카드·페이지 디자인을 저작하는 모듈. Storefront view를 소비하되, 반대 방향 참조는 없다.
_Avoid_: 에디터, 챗 워크스페이스

**Storefront config**:
저장된 storefront 설정을 읽고 쓰고 구버전을 마이그레이션하는 모듈. Storefront builder, public storefront page, office product editor, 대시보드 QR 카드가 모두 이 모듈 하나를 통해 설정에 접근한다.
_Avoid_: config 서비스, 설정 API

**Public storefront page**:
`officeCode` 하나로 진입하는 공개 라우트. Storefront config로 설정을 읽고 Storefront view에 넘기는 것이 전부인 얇은 모듈.
_Avoid_: 공개 페이지 feature, 손님 페이지

### 데이터

**Storefront config**:
(위 모듈이 다루는 대상으로서) 한 영업점의 페이지 구성 전체 — 표시 필드, 카드 스타일, 페이지 스타일, 안내 항목, 카테고리 구성.
_Avoid_: 페이지 설정, 스토어 설정

**Information entry (안내 항목)**:
영업점이 직접 작성하는 안내문 한 건. 카테고리별 안내와 영업점 공통 안내로 나뉜다.
_Avoid_: 공지, 노트

**Card design / Page design**:
AI 저작의 두 대상. Card design은 상품 카드 한 장의 구성과 스타일, Page design은 페이지 전체의 색·타이포·헤더를 정한다.
_Avoid_: 테마, 스킨

## 의존 방향

```
public storefront page ─┐
                        ├─> storefront view   (순수, I/O 없음)
storefront builder ─────┘

public storefront page ─┐
storefront builder ─────┼─> storefront config ─> Supabase
office product editor ──┤
common (QR 카드) ───────┘
```

Storefront view는 어떤 모듈도 역참조하지 않는다. 이 방향이 깨지면 빌더 미리보기와 공개 페이지가 갈라진다.

`functions/api/storefront-ai/{card-style,page-style}.js`는 브라우저 코드가
아니면서도 `src/features/storefront-builder/model/{card,page}-design/ai-*`와
`storefront-view/model/*/style`을 직접 import한다. 클라이언트 진입점만
따라가면 이 모듈들이 죽은 코드로 보이므로, 사용처를 셀 때 `functions/`를
반드시 함께 본다.
