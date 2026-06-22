import { RequestValidationError } from './requestValidation';

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
