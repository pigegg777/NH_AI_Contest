import styles from './UnifiedDesignPromptField.module.css';

export default function UnifiedDesignPromptField({
  value,
  onChange,
  targetLabel,
  testId,
}) {
  const promptLabel =
    targetLabel === 'card' ? '카드 디자인 요청' : '페이지 디자인 요청';
  const placeholder =
    targetLabel === 'card'
      ? '예시: 상품 카드 이미지를 더 강조하고 가격은 더 눈에 띄게 보여줘'
      : '예시: 신뢰감 있는 블루 톤으로 정리하고 제목은 조금 더 굵게 해줘';

  return (
    <label className={styles.inputLabel}>
      <span>{promptLabel}</span>
      <textarea
        className={styles.textarea}
        name="unified-design-prompt"
        autoComplete="off"
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
