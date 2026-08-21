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
import { deleteProductImage } from '../../lib/supabaseStorageUpload.js';

const REQUEST_BODY_ALLOWED_KEYS = ['officeCode', 'path', 'supabaseUrl', 'supabasePublishableKey'];
const MAX_REQUEST_BODY_BYTES = 8 * 1024;

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request, {
    maxBytes: MAX_REQUEST_BODY_BYTES,
  });
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);
  const path = toOptionalTrimmedString(body.path);

  if (!path) {
    throw new RequestValidationError('path is required.', 422);
  }

  const { supabase } = await requireOwnedOffice({ request, env, officeCode, body });

  try {
    await deleteProductImage({ supabase, officeCode, path });
    return jsonResponse({ deleted: true });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      throw error;
    }

    return errorResponse(error instanceof Error ? error.message : 'Image delete failed.', 502);
  }
});
