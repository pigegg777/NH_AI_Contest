import styles from './PageStylePromptField.module.css';

export default function PageStylePromptField({
  value,
  onChange,
  className = '',
  describedBy,
}) {
  return (
    <label className={`${styles.inputLabel} ${className}`.trim()}>
      <span>페이지 스타일 요청</span>
      <textarea
        className={styles.textarea}
        name="page-style-prompt"
        autoComplete="off"
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예시: 신뢰감 있는 블루 톤으로 정리하고, 제목은 조금 더 굵게, 검색창 테두리는 강하게 해줘…"
      />
    </label>
  );
}
