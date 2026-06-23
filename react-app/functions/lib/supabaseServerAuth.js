import { createClient } from '@supabase/supabase-js';

import { RequestValidationError } from './requestValidation';

function createRequestScopedSupabaseClient(env, accessToken) {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

function extractBearerToken(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    throw new RequestValidationError('Missing bearer token.', 401);
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    throw new RequestValidationError('Missing bearer token.', 401);
  }

  return token;
}

export async function requireAuthenticatedSupabaseUser(request, env) {
  const accessToken = extractBearerToken(request);
  const supabase = createRequestScopedSupabaseClient(env, accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    throw new RequestValidationError('Invalid or expired session.', 401);
  }

  return { supabase, user: data.user };
}
