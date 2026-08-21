import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  RequestValidationError,
  toOptionalTrimmedString,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';
import { uploadProductImage } from '../../lib/supabaseStorageUpload.js';

const REQUEST_BODY_ALLOWED_KEYS = [
  'officeCode',
  'imageDataUri',
  'supabaseUrl',
  'supabasePublishableKey',
];
const MAX_UPLOAD_BODY_BYTES = 8 * 1024 * 1024;

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request, {
    maxBytes: MAX_UPLOAD_BODY_BYTES,
  });
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);
  const imageDataUri = toOptionalTrimmedString(body.imageDataUri);

  if (!imageDataUri) {
    throw new RequestValidationError('imageDataUri is required.', 422);
  }

  const { supabase } = await requireOwnedOffice({ request, env, officeCode, body });

  try {
    const { imageUrl } = await uploadProductImage({ supabase, officeCode, imageDataUri });
    return jsonResponse({ imageUrl });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      throw error;
    }

    return errorResponse(error instanceof Error ? error.message : 'Image upload failed.', 502);
  }
});
