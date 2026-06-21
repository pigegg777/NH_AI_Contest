import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function PageStyleMainPromptField({ value, onChange }) {
  return (
    <label className={styles.inputLabel}>
      <span>전체 페이지 분위기</span>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예시: 신뢰감 있는 차가운 블루 톤으로, 깔끔하고 정돈된 느낌으로 해줘."
      />
    </label>
  );
}
