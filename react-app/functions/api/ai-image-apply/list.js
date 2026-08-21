import { errorResponse, jsonResponse } from '../../lib/jsonResponse.js';
import {
  pickAllowedKeys,
  readOfficeCode,
  readValidatedJsonBody,
  RequestValidationError,
  withRequestErrorHandling,
} from '../../lib/requestValidation.js';
import { requireOwnedOffice } from '../../lib/officeOwnershipGuard.js';
import { listProductImages } from '../../lib/supabaseStorageUpload.js';

const REQUEST_BODY_ALLOWED_KEYS = ['officeCode', 'supabaseUrl', 'supabasePublishableKey'];
const MAX_REQUEST_BODY_BYTES = 8 * 1024;

export const onRequestPost = withRequestErrorHandling(async ({ request, env }) => {
  const rawBody = await readValidatedJsonBody(request, {
    maxBytes: MAX_REQUEST_BODY_BYTES,
  });
  const body = pickAllowedKeys(rawBody, REQUEST_BODY_ALLOWED_KEYS);
  const officeCode = readOfficeCode(body);

  const { supabase } = await requireOwnedOffice({ request, env, officeCode, body });

  try {
    const images = await listProductImages({ supabase, officeCode });
    return jsonResponse({ images });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      throw error;
    }

    return errorResponse(error instanceof Error ? error.message : 'Image list failed.', 502);
  }
});
