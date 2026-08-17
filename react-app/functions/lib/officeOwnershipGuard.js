import { RequestValidationError } from './requestValidation';
import { requireAuthenticatedSupabaseUser } from './supabaseServerAuth';
import { buildLocalSupabaseEnvFallback } from './localSupabaseEnvFallback';

export async function assertOfficeOwnership({ supabase, authUserId, officeCode }) {
  const { data, error } = await supabase
    .from('login_users')
    .select('office_code')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data || data.office_code !== officeCode) {
    throw new RequestValidationError('officeCode does not match the authenticated user.', 403);
  }
}

// Every handler needs the same three steps in the same order: resolve the
// effective env (honoring the local-dev Supabase fallback when the request
// body carries one), authenticate the bearer token against it, then verify
// the authenticated user actually owns officeCode. body may be omitted by
// handlers that never populate supabaseUrl/supabasePublishableKey — the
// fallback is then simply a no-op, identical to passing env through as-is.
export async function requireOwnedOffice({ request, env, officeCode, body = {} }) {
  const effectiveEnv = { ...buildLocalSupabaseEnvFallback(request, body), ...env };
  const { supabase, user } = await requireAuthenticatedSupabaseUser(request, effectiveEnv);
  await assertOfficeOwnership({ supabase, authUserId: user.id, officeCode });

  return { supabase, user };
}
