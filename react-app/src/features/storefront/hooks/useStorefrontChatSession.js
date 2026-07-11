import { useSyncExternalStore } from 'react';

const DEFAULT_MODE = 'idle';
const INITIAL_MESSAGE_ID = 'storefront-chat-message-1';

let messageIdCounter = 1;
let storefrontChatSessionState = createInitialState();
const storefrontChatSessionListeners = new Set();

function cloneSnapshot(snapshot) {
  if (snapshot == null) {
    return snapshot;
  }

  return typeof structuredClone === 'function'
    ? structuredClone(snapshot)
    : JSON.parse(JSON.stringify(snapshot));
}

function normalizeMessage(id, payload) {
  const { id: _ignoredId, ...cleanPayload } = payload ?? {};

  return {
    id,
    ...cleanPayload,
  };
}

function createInitialModeChoiceMessage({ isActionable = true } = {}) {
  return {
    role: 'assistant',
    kind: 'mode-choice',
    isActionable,
    text: '다음 스토어프론트 모드를 선택하세요.',
  };
}

function createModeTransitionMessage(nextMode) {
  return {
    role: 'assistant',
    kind: 'mode-transition',
    mode: nextMode,
    text: `${nextMode} 모드로 전환했습니다.`,
  };
}

function resolveApplyResultText(summary) {
  if (typeof summary === 'string' && summary.trim()) {
    return summary.trim();
  }

  if (summary && typeof summary === 'object') {
    const text = typeof summary.text === 'string' ? summary.text.trim() : '';

    if (text) {
      return text;
    }
  }

  return '적용되었습니다.';
}

function resolveApplyPayload(payload) {
  if (payload && typeof payload === 'object' && ('summary' in payload || 'snapshot' in payload)) {
    return {
      summary: payload.summary,
      snapshot: payload.snapshot,
    };
  }

  return {
    summary: undefined,
    snapshot: payload,
  };
}

function createApplyResultMessage({ snapshot, summary }) {
  return {
    role: 'assistant',
    kind: 'apply-result',
    summary,
    text: resolveApplyResultText(summary),
    snapshot: cloneSnapshot(snapshot),
  };
}

function createInitialState() {
  messageIdCounter = 1;

  return {
    mode: DEFAULT_MODE,
    messages: [
      normalizeMessage(
        INITIAL_MESSAGE_ID,
        createInitialModeChoiceMessage(),
      ),
    ],
    lastApplySnapshot: undefined,
  };
}

function nextMessageId() {
  messageIdCounter += 1;
  return `storefront-chat-message-${messageIdCounter}`;
}

function appendMessagesToList(messages, nextPayloads) {
  const payloads = Array.isArray(nextPayloads) ? nextPayloads : [nextPayloads];
  let nextMessages = messages;

  payloads.forEach((payload) => {
    nextMessages = [...nextMessages, normalizeMessage(nextMessageId(), payload)];
  });

  return nextMessages;
}

function emitStorefrontChatSessionChange() {
  storefrontChatSessionListeners.forEach((listener) => listener());
}

function setStorefrontChatSessionState(updater) {
  const nextState =
    typeof updater === 'function'
      ? updater(storefrontChatSessionState)
      : updater;

  storefrontChatSessionState = nextState;
  emitStorefrontChatSessionChange();
}

function subscribeToStorefrontChatSession(listener) {
  storefrontChatSessionListeners.add(listener);

  return () => {
    storefrontChatSessionListeners.delete(listener);

    if (storefrontChatSessionListeners.size === 0) {
      storefrontChatSessionState = createInitialState();
    }
  };
}

function getStorefrontChatSessionSnapshot() {
  return storefrontChatSessionState;
}

function appendMessage(message) {
  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    messages: appendMessagesToList(currentState.messages, message),
  }));
}

function appendMessages(nextPayloads) {
  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    messages: appendMessagesToList(currentState.messages, nextPayloads),
  }));
}

function chooseMode(nextMode) {
  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    mode: nextMode,
    messages: appendMessagesToList(
      currentState.messages,
      createModeTransitionMessage(nextMode),
    ),
  }));
}

function reactivateModeChoiceMessages(messages) {
  return messages.map((message) =>
    message.kind === 'mode-choice' ? { ...message, isActionable: true } : message,
  );
}

function returnToIdle() {
  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    mode: DEFAULT_MODE,
    messages: reactivateModeChoiceMessages(currentState.messages),
  }));
}

function recordSuccessfulApply(payload) {
  const { snapshot, summary } = resolveApplyPayload(payload);
  const clonedSnapshot = cloneSnapshot(snapshot);

  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    lastApplySnapshot: clonedSnapshot,
    messages: appendMessagesToList(
      currentState.messages,
      createApplyResultMessage({ snapshot: clonedSnapshot, summary }),
    ),
  }));
}

function clearLastApplySnapshot() {
  setStorefrontChatSessionState((currentState) => ({
    ...currentState,
    lastApplySnapshot: undefined,
  }));
}

function completeMode(payload) {
  const { snapshot, summary } = resolveApplyPayload(payload);
  const clonedSnapshot = cloneSnapshot(snapshot);

  setStorefrontChatSessionState((currentState) => {
    const messagesWithResult = appendMessagesToList(
      currentState.messages,
      createApplyResultMessage({ snapshot: clonedSnapshot, summary }),
    );

    return {
      ...currentState,
      mode: DEFAULT_MODE,
      lastApplySnapshot: clonedSnapshot,
      messages: reactivateModeChoiceMessages(messagesWithResult),
    };
  });
}

export function useStorefrontChatSession() {
  const snapshot = useSyncExternalStore(
    subscribeToStorefrontChatSession,
    getStorefrontChatSessionSnapshot,
    getStorefrontChatSessionSnapshot,
  );

  return {
    ...snapshot,
    chooseMode,
    returnToIdle,
    recordSuccessfulApply,
    clearLastApplySnapshot,
    completeMode,
    appendMessage,
    appendMessages,
  };
}
