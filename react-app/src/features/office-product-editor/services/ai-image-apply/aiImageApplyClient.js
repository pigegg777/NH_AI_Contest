import { toTrimmedString } from '../../../../common/utils/text';
import { postAuthenticatedJson } from '../../../../common/services/postAuthenticatedJson';

const GENERATE_ENDPOINT = '/api/ai-image-apply/generate';
const UPLOAD_ENDPOINT = '/api/ai-image-apply/upload';
const MATCH_ENDPOINT = '/api/ai-image-apply/match';
const LIST_ENDPOINT = '/api/ai-image-apply/list';
const DELETE_ENDPOINT = '/api/ai-image-apply/delete';

export async function requestAiImageGenerate({ officeCode, prompt }) {
  const body = await postAuthenticatedJson(
    GENERATE_ENDPOINT,
    { officeCode: toTrimmedString(officeCode), prompt: toTrimmedString(prompt) },
    { failureLabel: 'AI image generation request' },
  );

  return {
    imageDataUri: typeof body?.imageDataUri === 'string' ? body.imageDataUri : '',
    prompt: typeof body?.prompt === 'string' ? body.prompt : '',
  };
}

export async function requestAiImageUpload({ officeCode, imageDataUri }) {
  const body = await postAuthenticatedJson(
    UPLOAD_ENDPOINT,
    { officeCode: toTrimmedString(officeCode), imageDataUri },
    { failureLabel: 'Image upload request' },
  );

  return { imageUrl: typeof body?.imageUrl === 'string' ? body.imageUrl : '' };
}

export async function requestAiImageApplyMatches({ officeCode, instruction, rows }) {
  const body = await postAuthenticatedJson(
    MATCH_ENDPOINT,
    {
      officeCode: toTrimmedString(officeCode),
      instruction: toTrimmedString(instruction),
      rows,
    },
    { failureLabel: 'AI image apply match request' },
  );

  return {
    rowIds: Array.isArray(body?.rowIds) ? body.rowIds : [],
    unmatchedReason: body?.unmatchedReason ?? null,
  };
}

export async function requestAiImageList({ officeCode }) {
  const body = await postAuthenticatedJson(
    LIST_ENDPOINT,
    { officeCode: toTrimmedString(officeCode) },
    { failureLabel: 'Image list request' },
  );

  return { images: Array.isArray(body?.images) ? body.images : [] };
}

export async function requestAiImageDelete({ officeCode, path }) {
  await postAuthenticatedJson(
    DELETE_ENDPOINT,
    { officeCode: toTrimmedString(officeCode), path },
    { failureLabel: 'Image delete request' },
  );
}
