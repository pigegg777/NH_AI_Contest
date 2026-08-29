import {
  requestAiImageDelete,
  requestAiImageGenerate,
  requestAiImageList,
  requestAiImageUpload,
} from '../../services/ai-image-apply/aiImageApplyClient';

export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const AI_IMAGE_UPLOAD_ERROR = {
  UNSUPPORTED_TYPE: 'unsupported-type',
  TOO_LARGE: 'too-large',
  UNREADABLE: 'unreadable',
};

function readFileAsDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 업로드해도 되는 파일인지 본다. 통과하면 null, 아니면 { error } 를 돌려준다
 * — 문구는 호출자가 정한다.
 *
 * 동기인 것이 계약의 일부다. 파일을 고른 즉시 오류가 보여야 하므로, 읽기를
 * 기다리는 사이에 판정이 늦어지면 안 된다.
 */
export function validateUploadableImageFile(file) {
  if (!ALLOWED_UPLOAD_TYPES.includes(file?.type)) {
    return { error: AI_IMAGE_UPLOAD_ERROR.UNSUPPORTED_TYPE };
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return { error: AI_IMAGE_UPLOAD_ERROR.TOO_LARGE, maxBytes: MAX_UPLOAD_FILE_BYTES };
  }

  return null;
}

/** 검증을 통과한 파일을 업로드용 data URI 로 바꾼다. */
export async function readImageFileAsDataUri(file) {
  return readFileAsDataUri(file);
}

// 아래 넷은 응답 봉투를 벗겨 값만 돌려준다. 호출자는 엔드포인트가 무엇을
// 감싸서 주는지 알 필요가 없다.

export async function generateAiImage({ officeCode, prompt }) {
  const { imageDataUri } = await requestAiImageGenerate({ officeCode, prompt });
  return imageDataUri;
}

export async function uploadAiImage({ officeCode, imageDataUri }) {
  const { imageUrl } = await requestAiImageUpload({ officeCode, imageDataUri });
  return imageUrl;
}

export async function listAiImages(officeCode) {
  const { images } = await requestAiImageList({ officeCode });
  return images;
}

export async function deleteAiImage({ officeCode, path }) {
  await requestAiImageDelete({ officeCode, path });
}
