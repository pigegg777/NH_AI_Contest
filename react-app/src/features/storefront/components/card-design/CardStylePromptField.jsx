import styles from './CardStylePromptField.module.css';

export default function CardStylePromptField({
  value,
  onChange,
  className = '',
  describedBy,
  testId,
}) {
  return (
    <label className={`${styles.inputLabel} ${className}`.trim()}>
      <span>카드 디자인 요청</span>
      <textarea
        className={styles.textarea}
        name="card-style-prompt"
        autoComplete="off"
        aria-describedby={describedBy}
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예시: 비료 상품을 신뢰감 있게 보여주고, 제목은 조금 더 굵게 해줘"
      />
    </label>
  );
}
