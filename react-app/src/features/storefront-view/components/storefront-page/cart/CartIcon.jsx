/**
 * 쇼핑백. 담기 버튼과 장바구니 열기 버튼이 같은 모양을 쓴다 — 담기 쪽은
 * "장바구니 담기" 라는 글자가 뜻을 이미 전하므로 아이콘에 더하기를 붙이지
 * 않는다.
 *
 * 배경 없이 선만 그리고 색은 currentColor 를 따르므로, 놓이는 자리의 글자색을
 * 그대로 물려받는다. 원본 SVG 파일을 받으면 이 path 를 그것으로 바꾸면 된다.
 */
export default function CartIcon({ className, size = 20 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* 가방 몸통 — 아래로 갈수록 살짝 넓어진다 */}
      <path d="M4.3 7.4h15.4l1.1 13.4H3.2z" />
      {/* 손잡이 — 다리가 가방 윗선 안쪽까지 내려온다 */}
      <path d="M8.2 9.8V6.3a3.8 3.8 0 0 1 7.6 0v3.5" />
    </svg>
  );
}
