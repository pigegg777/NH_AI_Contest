import { RequestValidationError } from './requestValidation.js';

const BUCKET_NAME = 'product-images';
const DATA_URI_PATTERN = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/;

function decodeImageDataUri(imageDataUri) {
  const match = typeof imageDataUri === 'string' ? imageDataUri.match(DATA_URI_PATTERN) : null;

  if (!match) {
    throw new RequestValidationError(
      'imageDataUri must be a base64 PNG/JPEG/WEBP data URI.',
      422,
    );
  }

  const [, contentType, extensionRaw, base64Body] = match;
  const extension = extensionRaw === 'jpeg' ? 'jpg' : extensionRaw;
  const binary = Uint8Array.from(atob(base64Body), (char) => char.charCodeAt(0));

  return { contentType, extension, binary };
}

export async function uploadProductImage({ supabase, officeCode, imageDataUri }) {
  const { contentType, extension, binary } = decodeImageDataUri(imageDataUri);
  const objectPath = `${officeCode}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(objectPath, binary, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Image upload failed.');
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw new Error('Failed to resolve uploaded image URL.');
  }

  return { imageUrl: data.publicUrl, path: objectPath };
}

export async function listProductImages({ supabase, officeCode }) {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(officeCode, {
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    throw new Error(error.message || 'Failed to list images.');
  }

  return (Array.isArray(data) ? data : [])
    .filter((entry) => entry?.id)
    .map((entry) => {
      const path = `${officeCode}/${entry.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

      return {
        path,
        url: urlData?.publicUrl ?? '',
        createdAt: entry.created_at ?? null,
      };
    });
}

export async function deleteProductImage({ supabase, officeCode, path }) {
  if (typeof path !== 'string' || !path.startsWith(`${officeCode}/`)) {
    throw new RequestValidationError('path must belong to the requesting office.', 422);
  }

  const { data, error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(error.message || 'Image delete failed.');
  }

  // Supabase Storage reports RLS filtering the target out as a *success*
  // with an empty result, not an error — remove() only tells you what it
  // could see and delete. Without this check, a missing/broken delete
  // policy silently no-ops here while the endpoint still returns 200, so
  // the UI drops the image from its list even though the file is untouched
  // in the bucket.
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Image could not be deleted (not found or no permission).');
  }
}
