import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function PageStyleOverrideFields({
  headerOverridePrompt,
  categoryChipsOverridePrompt,
  searchOverridePrompt,
  onChangeHeaderOverridePrompt,
  onChangeCategoryChipsOverridePrompt,
  onChangeSearchOverridePrompt,
}) {
  return (
    <div className={styles.sectionStack}>
      <label className={styles.inputLabel}>
        <span>헤더 제목 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={headerOverridePrompt}
          onChange={(event) => onChangeHeaderOverridePrompt(event.target.value)}
          placeholder="예시: 제목을 더 진하고 굵게 보여줘."
        />
      </label>
      <label className={styles.inputLabel}>
        <span>카테고리 칩 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={categoryChipsOverridePrompt}
          onChange={(event) => onChangeCategoryChipsOverridePrompt(event.target.value)}
          placeholder="예시: 선택된 칩은 꽉 채운 느낌으로 보여줘."
        />
      </label>
      <label className={styles.inputLabel}>
        <span>검색창 스타일 (선택)</span>
        <textarea
          className={styles.textarea}
          value={searchOverridePrompt}
          onChange={(event) => onChangeSearchOverridePrompt(event.target.value)}
          placeholder="예시: 검색창을 조금 더 크게, 테두리는 진하게 해줘."
        />
      </label>
    </div>
  );
}
