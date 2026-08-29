/**
 * 카드 제목의 축소 하한. 카드는 여러 장이 나란히 서서 서로 비교되므로 너무
 * 작아지면 목록이 들쭉날쭉해 보인다. 여기서 멈추고 말줄임에 맡긴다.
 */
export const MIN_TITLE_SCALE = 0.72;

/**
 * 페이지 헤더 제목이 줄어들 수 있는 최소 글자 크기(px).
 *
 * 비율이 아니라 절대 크기로 잡는다 — 사장님이 제목을 크게 설정할수록 비율
 * 하한은 덜 줄어들어서, 큰 글자일수록 오히려 잘리기 쉬웠다. px 로 잡으면
 * 출발 크기와 무관하게 읽을 수 있는 최소까지 일관되게 줄어든다.
 */
export const MIN_PAGE_TITLE_FONT_SIZE_PX = 1;

/**
 * 한 줄에 넣기 위해 제목 글자를 얼마나 줄일지 정한다.
 *
 * 글자 폭은 글자 크기에 거의 비례하므로 넘친 비율을 그대로 배율로 쓴다.
 * 한 번의 측정으로 대부분 맞고, 폰트 자간·힌팅 때문에 미세하게 남는 차이는
 * 호출자가 한 번 더 재서 보정한다.
 */
export function resolveTitleScale({
  contentWidth,
  availableWidth,
  minScale = MIN_TITLE_SCALE,
}) {
  if (!Number.isFinite(contentWidth) || !Number.isFinite(availableWidth)) {
    return 1;
  }

  if (
    contentWidth <= 0 ||
    availableWidth <= 0 ||
    contentWidth <= availableWidth
  ) {
    return 1;
  }

  return Math.max(minScale, availableWidth / contentWidth);
}
