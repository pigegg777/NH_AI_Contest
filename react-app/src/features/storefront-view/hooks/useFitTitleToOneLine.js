import { useCallback, useLayoutEffect, useRef } from 'react';

import { MIN_TITLE_SCALE, resolveTitleScale } from '../model/card-grid-section/titleFitModel';

const TITLE_SCALE_VAR = '--title-fit-scale';

/**
 * 제목이 한 줄을 넘치면 글자를 줄여서 한 줄에 맞춘다.
 *
 * 반복 루프 대신 넘친 비율을 한 번에 적용하고 한 번만 보정한다 — 카드가
 * 수십~수백 개라 측정을 반복하면 그만큼 리플로우가 쌓인다. 두 번으로도
 * 남는 오차는 말줄임이 받아준다.
 *
 * 폰트가 늦게 로드되면 글자 폭이 달라지므로 로드 후 한 번 더 잰다.
 */
/**
 * @param {string} text  바뀌면 다시 맞춘다.
 * @param {object} [options]
 * @param {number} [options.minScale]      비율 하한.
 * @param {number} [options.minFontSizePx] 절대 크기 하한. 주면 비율 대신 이걸
 *   쓴다 — 사장님이 제목을 크게 설정할수록 비율 하한은 덜 줄어들어서, 큰
 *   글자일수록 오히려 잘리기 쉬웠다. px 로 잡으면 출발 크기와 무관하게
 *   "읽을 수 있는 최소"까지 일관되게 줄어든다.
 */
export function useFitTitleToOneLine(
  text,
  { minScale = MIN_TITLE_SCALE, minFontSizePx = 0 } = {},
) {
  const ref = useRef(null);

  const fit = useCallback(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    element.style.setProperty(TITLE_SCALE_VAR, '1');

    const naturalFontSize = Number.parseFloat(
      window.getComputedStyle(element).fontSize,
    );
    const floor =
      minFontSizePx > 0 && Number.isFinite(naturalFontSize) && naturalFontSize > 0
        ? Math.min(1, minFontSizePx / naturalFontSize)
        : minScale;

    // 배율을 되돌린 직후의 자연 폭으로 잰다.
    let scale = resolveTitleScale({
      contentWidth: element.scrollWidth,
      availableWidth: element.clientWidth,
      minScale: floor,
    });

    if (scale >= 1) {
      return;
    }

    element.style.setProperty(TITLE_SCALE_VAR, String(scale));

    // 글자 폭은 크기에 정확히 비례하지 않는다(자간·힌팅·반올림). 줄인 뒤에도
    // 남은 초과분만큼 배율을 한 번 더 곱한다 — 덮어쓰면 첫 축소가 사라진다.
    for (let pass = 0; pass < 3 && scale > floor; pass += 1) {
      const residual = resolveTitleScale({
        contentWidth: element.scrollWidth,
        availableWidth: element.clientWidth,
        minScale: 0,
      });

      if (residual >= 1) {
        break;
      }

      scale = Math.max(floor, scale * residual);
      element.style.setProperty(TITLE_SCALE_VAR, String(scale));
    }
  }, [minScale, minFontSizePx]);

  useLayoutEffect(() => {
    fit();

    const element = ref.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    /**
     * 글자 크기를 바꾸면 이 요소의 크기도 바뀌어 관찰자가 다시 불린다. 그대로
     * 두면 잰다 -> 바꾼다 -> 다시 불린다 가 끝없이 돈다. 우리가 만든 변화는
     * 다음 프레임까지 무시하고, 바깥에서 온 변화(스크롤바가 생겨 폭이 줄거나
     * 화면이 회전하는 등)에만 다시 맞춘다.
     */
    let isAdjusting = false;
    let frame = 0;

    const observer = new ResizeObserver(() => {
      if (isAdjusting) {
        return;
      }

      isAdjusting = true;
      fit();
      frame = requestAnimationFrame(() => {
        isAdjusting = false;
      });
    });
    observer.observe(element);

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) {
        fit();
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fit, text]);

  return ref;
}
