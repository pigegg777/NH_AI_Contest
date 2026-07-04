import { createClient } from '@supabase/supabase-js';

import { RequestValidationError } from './requestValidation';

function normalizeEnvValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value).trim();
  }

  return '';
}

function readRequiredEnvValue(env, keys) {
  const sources = [env, globalThis.process?.env];

  for (const source of sources) {
    for (const key of keys) {
      const normalizedValue = normalizeEnvValue(source?.[key]);

      if (normalizedValue !== '') {
        return normalizedValue;
      }
    }
  }

  throw new RequestValidationError('Server is missing Supabase environment configuration.', 500);
}

function createRequestScopedSupabaseClient(env, accessToken) {
  const supabaseUrl = readRequiredEnvValue(env, ['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const supabasePublishableKey = readRequiredEnvValue(env, [
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_KEY',
  ]);

  return createClient(supabaseUrl, supabasePublishableKey, {
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
