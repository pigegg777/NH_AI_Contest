import { useState } from 'react';

import styles from './CategoryImageGenPanel.module.css';

export default function CategoryImageGenPanel({
  mediumCategories,
  generatedCategoryImages,
  isGeneratingCategoryImage,
  onGenerate,
}) {
  const [promptDrafts, setPromptDrafts] = useState({});
  const [errorMessages, setErrorMessages] = useState({});

  if (!Array.isArray(mediumCategories) || mediumCategories.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel} data-testid="storefront-category-image-gen-panel">
      <p className={styles.label}>중분류별 AI 대체 이미지</p>
      <ul className={styles.list}>
        {mediumCategories.map((mediumCategory) => {
          const generated = generatedCategoryImages?.[mediumCategory];
          const isGenerating = Boolean(isGeneratingCategoryImage?.[mediumCategory]);
          const inputId = `category-image-prompt-${mediumCategory}`;
          const errorMessage = errorMessages[mediumCategory];

          return (
            <li key={mediumCategory} className={styles.row}>
              {generated ? (
                <img
                  className={styles.thumbnail}
                  src={generated.imageDataUri}
                  alt={`${mediumCategory} 생성 이미지 미리보기`}
                />
              ) : null}
              <div className={styles.rowMain}>
                <span className={styles.categoryName}>{mediumCategory}</span>
                <label className={styles.promptLabel} htmlFor={inputId}>
                  {`${mediumCategory} 이미지 요청`}
                </label>
                <input
                  id={inputId}
                  className={styles.promptInput}
                  type="text"
                  placeholder="비워두면 자동으로 요청합니다"
                  value={promptDrafts[mediumCategory] ?? ''}
                  onChange={(event) =>
                    setPromptDrafts((current) => ({ ...current, [mediumCategory]: event.target.value }))
                  }
                />
                {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
              </div>
              <button
                type="button"
                className={styles.generateButton}
                disabled={isGenerating}
                onClick={async () => {
                  const result = await onGenerate(mediumCategory, {
                    promptOverride: promptDrafts[mediumCategory] ?? '',
                  });

                  if (result && result.ok === false) {
                    setErrorMessages((current) => ({ ...current, [mediumCategory]: result.error }));
                  } else {
                    setErrorMessages((current) => {
                      if (!(mediumCategory in current)) {
                        return current;
                      }

                      const next = { ...current };
                      delete next[mediumCategory];

                      return next;
                    });
                  }
                }}
              >
                {isGenerating ? '생성 중...' : `${mediumCategory} 이미지 생성`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
