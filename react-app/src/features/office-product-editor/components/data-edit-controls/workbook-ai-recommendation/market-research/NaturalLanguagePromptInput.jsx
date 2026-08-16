import { useState } from 'react';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './NaturalLanguagePromptInput.module.css';

export function NaturalLanguagePromptInput({ marketResearch }) {
  const [promptDraft, setPromptDraft] = useState('');

  function handleSubmit() {
    const query = promptDraft.trim();

    if (query === '') {
      return;
    }

    marketResearch.handleMarketResearch(query);
  }

  return (
    <section
      className={`${primitives.panel} ${primitives.compactPanel} ${styles.promptBlock}`}
    >
      <div className={primitives.panelHeader}>
        <h4
          id="ai-natural-language-prompt-label"
          className={primitives.panelTitle}
        >
          💬 요청사항 입력
        </h4>
      </div>
      <p className={styles.desc}>
        AI에게 상품에대한 가격비교와 관련기사를 요청하세요
      </p>
      <div className={primitives.promptRow}>
        <textarea
          id="ai-natural-language-prompt"
          aria-labelledby="ai-natural-language-prompt-label"
          className={primitives.promptInput}
          value={promptDraft}
          onChange={(event) => setPromptDraft(event.target.value)}
          placeholder="예: 마진율이 낮은 상품 위주로 검토해줘"
          rows={1}
        />

        {marketResearch ? (
          <button
            type="button"
            className={styles.marketResearchButton}
            disabled={promptDraft.trim() === '' || marketResearch.isLoading}
            onClick={handleSubmit}
          >
            시장조사
          </button>
        ) : null}
      </div>
    </section>
  );
}
