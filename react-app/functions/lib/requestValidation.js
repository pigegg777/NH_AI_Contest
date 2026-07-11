const MAX_PROMPT_LENGTH = 2000;
const MAX_REQUEST_BODY_BYTES = 20000;
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_TURN_LENGTH = 500;

export class RequestValidationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
  }
}

export function assertPostJsonRequest(request) {
  if (request.method !== 'POST') {
    throw new RequestValidationError('Only POST is supported.', 405);
  }

  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new RequestValidationError('Request body must be application/json.', 422);
  }
}

export async function readJsonBody(request, { maxBytes = MAX_REQUEST_BODY_BYTES } = {}) {
  const contentLength = Number(request.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestValidationError('Request body is too large.', 413);
  }

  const rawBody = await request.text();

  if (rawBody.length > maxBytes) {
    throw new RequestValidationError('Request body is too large.', 413);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError('Request body must be valid JSON.', 422);
  }
}

export function assertPromptWithinLimit(prompt) {
  if (typeof prompt !== 'string' || prompt.trim() === '' || prompt.length > MAX_PROMPT_LENGTH) {
    throw new RequestValidationError(
      `prompt must be a non-empty string of at most ${MAX_PROMPT_LENGTH} characters.`,
      422,
    );
  }
}

export function assertOfficeCodePresent(officeCode) {
  if (typeof officeCode !== 'string' || officeCode.trim() === '') {
    throw new RequestValidationError('officeCode is required.', 422);
  }
}

export function pickAllowedKeys(source, allowedKeys) {
  const result = {};
  const safeSource = source && typeof source === 'object' ? source : {};

  for (const key of allowedKeys) {
    result[key] = safeSource[key];
  }

  return result;
}

export function assertHistoryWithinLimits(history) {
  if (history === undefined || history === null) {
    return;
  }

  if (!Array.isArray(history)) {
    throw new RequestValidationError('history must be an array.', 422);
  }

  if (history.length > MAX_HISTORY_TURNS) {
    throw new RequestValidationError(
      `history must contain at most ${MAX_HISTORY_TURNS} turns.`,
      422,
    );
  }

  for (const turn of history) {
    const role = turn?.role;
    const text = turn?.text;
    const hasValidRole = role === 'user' || role === 'assistant';
    const hasValidText = typeof text === 'string' && text.length <= MAX_HISTORY_TURN_LENGTH;

    if (!hasValidRole || !hasValidText) {
      throw new RequestValidationError(
        `each history turn must have role "user" or "assistant" and text of at most ${MAX_HISTORY_TURN_LENGTH} characters.`,
        422,
      );
    }
  }
}
