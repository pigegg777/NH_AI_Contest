import { useState } from 'react';
import controls from '../../shared/controlPrimitives.module.css';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiMarketResearchPromptInput.module.css';

export function AiMarketResearchPromptInput({ marketResearch }) {
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
      <div className={primitives.promptRow}>
        <textarea
          id="ai-natural-language-prompt"
          aria-labelledby="ai-natural-language-prompt-label"
          className={primitives.promptInput}
          value={promptDraft}
          onChange={(event) => setPromptDraft(event.target.value)}
          placeholder="예: 멀칭필름 0.02x100x500기준으로 가격 및 관련기사 검색해줘"
          rows={1}
        />

        {marketResearch ? (
          <button
            type="button"
            className={controls.actionButton}
            disabled={promptDraft.trim() === '' || marketResearch.isLoading}
            onClick={handleSubmit}
          >
            AI 시장조사 실행
          </button>
        ) : null}
      </div>
    </section>
  );
}
