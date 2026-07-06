import { useRef, useState } from 'react';

const DEFAULT_TARGET = 'page';

export function useUnifiedDesignSession() {
  const [selectedTarget, setSelectedTarget] = useState(DEFAULT_TARGET);
  const [promptDraft, setPromptDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `unified-design-message-${messageIdRef.current}`;
  }

  function createMessage(payload) {
    return {
      id: nextMessageId(),
      ts: Date.now(),
      ...payload,
    };
  }

  function resetSession() {
    setSelectedTarget(DEFAULT_TARGET);
    setPromptDraft('');
    setMessages([]);
  }

  return {
    selectedTarget,
    promptDraft,
    messages,
    setSelectedTarget,
    setPromptDraft,
    setMessages,
    createMessage,
    resetSession,
  };
}
