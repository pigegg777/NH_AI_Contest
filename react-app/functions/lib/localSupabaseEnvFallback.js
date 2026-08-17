function toOptionalTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isLocalDevelopmentRequest(request) {
  try {
    const hostname = new URL(request.url).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

export function buildLocalSupabaseEnvFallback(request, body) {
  if (!isLocalDevelopmentRequest(request)) {
    return {};
  }

  const supabaseUrl = toOptionalTrimmedString(body.supabaseUrl);
  const supabasePublishableKey = toOptionalTrimmedString(
    body.supabasePublishableKey,
  );
  const fallbackEnv = {};

  if (supabaseUrl) {
    fallbackEnv.SUPABASE_URL = supabaseUrl;
  }

  if (supabasePublishableKey) {
    fallbackEnv.SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
  }

  return fallbackEnv;
}
