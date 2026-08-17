import { useState } from 'react';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiCategoryImageGenerationPanel.module.css';

export function AiCategoryImageGenerationPanel({ categoryImageGeneration }) {
  const [promptOverrides, setPromptOverrides] = useState({});

  if (!categoryImageGeneration) {
    return null;
  }

  const {
    mediumCategories,
    generatedCategoryImages,
    isGeneratingCategoryImage,
    errorMessages,
    generateCategoryImage,
  } = categoryImageGeneration;

  function handlePromptOverrideChange(mediumCategory, value) {
    setPromptOverrides((current) => ({ ...current, [mediumCategory]: value }));
  }

  function handleGenerate(mediumCategory) {
    generateCategoryImage(mediumCategory, { promptOverride: promptOverrides[mediumCategory] || '' });
  }

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}>
      <div className={primitives.panelHeader}>
        <h4 id="category-image-generation-label" className={primitives.panelTitle}>
          🖼️ 대체 이미지 생성
        </h4>
      </div>
      <p className={styles.desc}>
        상품 이미지(img_url)가 없는 중분류에 노출할 대체 이미지를 AI로 생성합니다. 중분류별로
        하나씩 생성할 수 있습니다.
      </p>

      {mediumCategories.length === 0 ? (
        <p className={styles.status}>엑셀을 업로드하면 중분류 목록이 표시됩니다.</p>
      ) : (
        <ul className={styles.categoryList}>
          {mediumCategories.map((mediumCategory) => {
            const generated = generatedCategoryImages?.[mediumCategory];
            const isGenerating = Boolean(isGeneratingCategoryImage?.[mediumCategory]);
            const errorMessage = errorMessages?.[mediumCategory];

            return (
              <li key={mediumCategory} className={styles.categoryItem}>
                <div className={styles.categoryThumbWrap}>
                  {generated?.imageDataUri ? (
                    <img
                      className={styles.categoryThumb}
                      src={generated.imageDataUri}
                      alt={`${mediumCategory} 대체 이미지`}
                    />
                  ) : (
                    <div className={styles.categoryThumbPlaceholder} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.categoryBody}>
                  <span className={styles.categoryName}>{mediumCategory}</span>

                  <input
                    type="text"
                    className={styles.promptOverrideInput}
                    value={promptOverrides[mediumCategory] || ''}
                    onChange={(event) => handlePromptOverrideChange(mediumCategory, event.target.value)}
                    placeholder="원하는 이미지 스타일을 직접 입력 (선택)"
                  />

                  <button
                    type="button"
                    className={styles.generateButton}
                    disabled={isGenerating}
                    onClick={() => handleGenerate(mediumCategory)}
                  >
                    {isGenerating ? '생성 중...' : generated ? '다시 생성' : '이미지 생성'}
                  </button>

                  {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
