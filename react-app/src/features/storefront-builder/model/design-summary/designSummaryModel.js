import { normalizeCardStyle } from '../../../storefront-view/model/card-style/cardStyleModel';
import { STOREFRONT_FIELD_LABELS } from '../../../storefront-view/model/config-schema/storefrontConfigModel';
import { normalizePageStyle } from '../../../storefront-view/model/page-style/pageStyleModel';

/**
 * 저장된 디자인을 "사장님이 읽을 수 있는 문장"으로 옮긴다.
 *
 * 미리보기 옆에서 지금 무엇이 적용됐는지 확인하는 용도라, 원본 값(#6cc24a, 'pill',
 * 'header-top')은 한 글자도 화면에 내보내지 않는다. 색은 글자 대신 색칠한 네모로,
 * 토큰은 우리말로 바꾼다.
 *
 * 번역이 빠진 토큰은 조용히 원본 값으로 새어나가므로, 테스트가 각 *_OPTIONS 를
 * 전부 돌면서 "값이 토큰과 똑같으면 실패"로 잡는다. 사전에 항목을 더할 때는
 * 옵션 상수 쪽을 기준으로 채우면 된다.
 *
 * 두 함수 모두 normalize* 를 먼저 통과시킨다. 빈 값·깨진 값·아직 디자인을 만들지
 * 않은 분류를 여기서 따로 처리하지 않기 위해서다 — 기본값을 아는 곳은 한 군데뿐이어야 한다.
 */

const SIZE_SIX_STEP = {
  xs: '아주 작게',
  sm: '작게',
  md: '보통',
  lg: '크게',
  xl: '아주 크게',
  xxl: '가장 크게',
};

const CHIP_SIZE = { sm: '작게', md: '보통', lg: '크게' };

const CHIP_STYLE_MODE = { chip: '알약 버튼', tab: '밑줄 탭' };

const CHIP_RADIUS = {
  none: '각지게',
  square: '살짝 둥글게',
  rounded: '둥글게',
  pill: '완전 둥글게',
};

const CHIP_GAP = { none: '붙여서', tight: '좁게', normal: '보통', relaxed: '넓게' };

const BORDER_STRENGTH = {
  none: '없음',
  hairline: '아주 얇게',
  soft: '얇게',
  normal: '보통',
  strong: '두껍게',
  bold: '아주 두껍게',
};

const FONT_WEIGHT = {
  400: '보통',
  500: '조금 굵게',
  600: '굵게',
  700: '더 굵게',
  800: '아주 굵게',
  900: '가장 굵게',
};

const CARD_RADIUS = { md: '조금 둥글게', lg: '둥글게', xl: '많이 둥글게' };

const CARD_SHADOW = { none: '없음', soft: '은은하게', strong: '뚜렷하게' };

const CARD_SPACING = { tight: '좁게', normal: '보통', relaxed: '넓게' };

const IMAGE_FIT = { cover: '꽉 채우기', contain: '전체 보이기' };

const IMAGE_PLACEMENT = { top: '위쪽', left: '왼쪽', right: '오른쪽' };

const GROUPING_HINT = {
  default: '기본 순서대로',
  'summary-first': '요점 먼저',
  'detail-first': '자세한 정보 먼저',
  'price-compare': '가격 비교하기 좋게',
};

const GROUP_DISPLAY = {
  'inline-group': '한 줄에 나란히',
  'stack-group': '줄 바꿔 쌓기',
};

// 한글 조사는 앞 글자의 받침에 따라 갈린다. '대분류가' 는 맞지만 '상품명가' 는
// 틀린다 — 필드 이름이 데이터에서 오므로 고정할 수 없다.
function attachSubjectParticle(word) {
  const lastChar = word.charCodeAt(word.length - 1);
  const isHangulSyllable = lastChar >= 0xac00 && lastChar <= 0xd7a3;

  if (!isHangulSyllable) {
    return `${word}가`;
  }

  const hasFinalConsonant = (lastChar - 0xac00) % 28 !== 0;

  return `${word}${hasFinalConsonant ? '이' : '가'}`;
}

// 조건 한 줄을 통째로 만든다. 필드·연산자·값을 따로 늘어놓으면
// '대분류이(가) 농약이(가) 들어갈 때' 같은 문장이 나온다.
const CONDITION_PHRASE = {
  equals: (field, value) => `${attachSubjectParticle(field)} '${value}'일 때`,
  // '에' 는 받침을 가리지 않고, 값 뒤에 조사를 붙이지 않아 값이 무엇이든 안전하다.
  contains: (field, value) => `${field}에 '${value}' 포함`,
};

// 규칙이 실제로 덮어쓰는 자리. 값이 있는 것만 골라 '무엇이 달라지는지'로 읽힌다.
const CONDITIONAL_TARGET = {
  shell: '테두리',
  header: '제목 줄',
  image: '사진',
  info: '정보 배경',
  field: '가격 글자색',
};

const SECTION_NAME = { header: '제목', image: '이미지', info: '정보' };

function textItem(label, dictionary, token) {
  return { label, kind: 'text', value: dictionary[token] ?? String(token) };
}

// 색을 글자로 적으면 사장님은 읽을 수 없다. 값은 보조 설명으로만 남기고
// 실제 확인은 swatchHex 로 칠한 네모가 한다.
function colorItem(label, hex) {
  const value = typeof hex === 'string' ? hex.trim() : '';

  if (!value) {
    return { label, kind: 'text', value: '지정 안 함' };
  }

  return { label, kind: 'color', value, swatchHex: value };
}

function group(id, title, items) {
  return { id, title, items };
}

const fieldLabel = (field) => STOREFRONT_FIELD_LABELS[field] ?? field;

// 사장님이 "규격이랑 성분은 붙여줘" 처럼 요청해 만들어진 묶음. 저장은 필드 키
// 배열로 되지만, 화면에는 그 줄에 실제로 찍히는 이름으로 보여야 알아본다.
function buildGroupingItems(style) {
  const items = [textItem('묶는 방식', GROUPING_HINT, style.layoutPlan.groupingHint)];
  const groups = style.info.requestedGroups;

  if (groups.length === 0) {
    items.push({ key: 'no-group', label: '묶음', kind: 'text', value: '따로 묶지 않음' });

    return items;
  }

  groups.forEach((group, index) => {
    const display = GROUP_DISPLAY[group.display] ?? group.display;

    items.push({
      key: `group-${group.id}`,
      // 묶음 이름은 사장님이 직접 지은 것이라 없을 수도 있다.
      label: group.label || `묶음 ${index + 1}`,
      kind: 'text',
      value: `${group.fields.map(fieldLabel).join(' · ')} (${display})`,
    });
  });

  return items;
}

// "농약이면 초록 테두리" 같은 규칙. 조건을 한 문장으로 읽히게 하고, 값 쪽에는
// 그 규칙이 무엇을 바꾸는지만 적는다 — 바뀐 색까지 늘어놓으면 다시 데이터 나열이 된다.
function buildConditionalItems(style) {
  const rules = style.conditionalStyles;

  if (rules.length === 0) {
    return [{ key: 'no-rule', label: '조건부 디자인', kind: 'text', value: '없음' }];
  }

  return rules.map((rule, index) => {
    const phrase = CONDITION_PHRASE[rule.conditionOperator] ?? CONDITION_PHRASE.contains;
    const changed = Object.keys(CONDITIONAL_TARGET)
      .filter((target) => rule[target])
      .map((target) => CONDITIONAL_TARGET[target]);

    return {
      key: `rule-${index}`,
      label: phrase(fieldLabel(rule.conditionField), rule.conditionValue),
      kind: 'text',
      value: `${changed.join(', ')} 다르게`,
    };
  });
}

export function buildPageDesignSummary(pageStyle) {
  const style = normalizePageStyle(pageStyle);
  const large = style.productCategoryChips;
  const detail = style.categoryChips;

  return [
    group('page-color', '페이지 색', [
      colorItem('배경 색', style.palette.backgroundHex),
      colorItem('포인트 색', style.palette.accentHex),
    ]),
    group('page-title', '가게 이름', [
      textItem('제목 크기', SIZE_SIX_STEP, style.header.titleFontSizeToken),
      textItem('제목 굵기', FONT_WEIGHT, style.header.fontWeight),
      colorItem('제목 색', style.header.titleColorHex),
    ]),
    group('page-search', '검색창', [
      textItem('검색창 크기', SIZE_SIX_STEP, style.search.sizeToken),
      textItem('검색창 테두리', BORDER_STRENGTH, style.search.borderStrengthToken),
      colorItem('검색창 배경', style.search.backgroundHex),
    ]),
    group('page-large-chip', '대분류 버튼', [
      textItem('대분류 모양', CHIP_STYLE_MODE, large.styleMode),
      textItem('대분류 모서리', CHIP_RADIUS, large.radiusToken),
      textItem('대분류 크기', CHIP_SIZE, large.sizeToken),
      textItem('대분류 간격', CHIP_GAP, large.gapToken),
      colorItem('대분류 선택 색', large.activeBackgroundHex),
    ]),
    group('page-detail-chip', '세부 분류 버튼', [
      textItem('세부 분류 모양', CHIP_STYLE_MODE, detail.styleMode),
      textItem('세부 분류 모서리', CHIP_RADIUS, detail.radiusToken),
      textItem('세부 분류 크기', CHIP_SIZE, detail.sizeToken),
      textItem('세부 분류 간격', CHIP_GAP, detail.gapToken),
      colorItem('세부 분류 선택 색', detail.activeBackgroundHex),
    ]),
  ];
}

export function buildCardDesignSummary(cardStyle) {
  const style = normalizeCardStyle(cardStyle);
  const plan = style.layoutPlan;
  // 사장님이 보는 것은 카드 안에서 무엇이 위에 오느냐이지, 배열의 순서가 아니다.
  const sectionOrder = plan.sectionOrder.map((section) => SECTION_NAME[section] ?? section).join(' → ');

  return [
    group('card-layout', '카드 배치', [
      { label: '한 줄에', kind: 'text', value: `${style.cardsPerRow}개` },
      { label: '배치 순서', kind: 'text', value: sectionOrder },
      textItem('이미지 위치', IMAGE_PLACEMENT, plan.imagePlacement),
      // layoutPlan 에서 emphasis, titleClamp, contentDensity 는 일부러 뺀다. emphasis 는
      // data-layout-emphasis 속성으로만 나가고 그것을 읽는 CSS 가 없어 화면이
      // 달라지지 않고, titleClamp 는 AI 스키마에도 수동 조작에도 없어 사장님이
      // 바꿀 방법이 없다. contentDensity 는 카드 안쪽 여백을 실제로 바꾸지만
      // 사장님이 조절하는 값으로 다루지 않기로 했다. 못 바꾸는(또는 안 다루는)
      // 값을 적어 두면 바꿔 달라는 요청만 부른다.
    ]),
    group('card-grouping', '정보 묶음', buildGroupingItems(style)),
    group('card-shape', '카드 모양', [
      textItem('모서리', CARD_RADIUS, style.shell.radius),
      textItem('그림자', CARD_SHADOW, style.shell.shadow),
      textItem('카드 간격', CARD_SPACING, style.shell.spacing),
      colorItem('테두리 색', style.shell.borderColor),
    ]),
    group('card-title', '카드 제목', [
      textItem('제목 크기', SIZE_SIX_STEP, style.header.titleSizeToken),
      textItem('제목 굵기', FONT_WEIGHT, style.header.fontWeight),
      colorItem('제목 글자 색', style.header.titleColorHex),
      colorItem('제목 줄 배경', style.header.backgroundColor),
    ]),
    group('card-image', '상품 사진', [
      textItem('이미지 채움', IMAGE_FIT, style.image.fit),
      { label: '이미지 높이', kind: 'text', value: `${style.image.sizePx}px` },
    ]),
    group('card-conditional', '조건에 따라 다르게', buildConditionalItems(style)),
  ];
}

/**
 * 접힌 상태에서도 보이는 한 줄 요약.
 *
 * 폰 목업이 미리보기 칸을 거의 다 쓰므로 이 패널은 접혀 있는 시간이 길다. 접힌
 * 채로도 "무슨 색인지, 카드가 몇 개씩인지"는 보여야 열어볼지 판단할 수 있다.
 * 항목을 고를 때는 이미 만든 요약을 다시 읽는다 — 번역이 두 벌 생기지 않게.
 */
export function buildAppliedDesignHeadline(pageStyle, cardStyle) {
  const page = normalizePageStyle(pageStyle);
  const swatches = [
    { label: '배경 색', hex: page.palette.backgroundHex },
    { label: '포인트 색', hex: page.palette.accentHex },
  ];
  const facts = [];

  if (cardStyle) {
    const cardGroups = buildCardDesignSummary(cardStyle);
    const pick = (label) =>
      cardGroups.flatMap((cardGroup) => cardGroup.items).find((item) => item.label === label);

    swatches.push({ label: '카드 테두리', hex: pick('테두리 색').swatchHex ?? '' });
    // 배치 순서('제목 → 이미지 → 정보')는 이 한 줄에 넣으면 잘린다. 접힌
    // 상태에서는 짧게 두고, 긴 항목은 펼쳤을 때 보게 한다.
    facts.push(`한 줄에 ${pick('한 줄에').value}`, `그림자 ${pick('그림자').value}`);
  } else {
    const pageGroups = buildPageDesignSummary(pageStyle);
    const pick = (label) =>
      pageGroups.flatMap((pageGroup) => pageGroup.items).find((item) => item.label === label);

    facts.push(`대분류 ${pick('대분류 모양').value}`, `제목 ${pick('제목 크기').value}`);
  }

  return { swatches: swatches.filter((swatch) => swatch.hex), facts };
}
