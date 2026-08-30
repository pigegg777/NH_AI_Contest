import { toLowerTrimmedString, toTrimmedString } from '../../../common/utils/text';
import supabase from '../../../lib/supabaseClient';

const LOGIN_USER_PROFILE_SELECT =
  'employee_id, auth_user_id, name, nh_name, office_name, office_code';
const AUTH_EMAIL_DOMAIN = 'auth.nh-agri.local';

export function buildAuthEmail(employeeId) {
  return `${toTrimmedString(employeeId)
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')}@${AUTH_EMAIL_DOMAIN}`;
}

export async function getUserProfileByAuthUserId(authUserId) {
  const normalizedAuthUserId = toTrimmedString(authUserId);

  if (!normalizedAuthUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('login_users')
    .select(LOGIN_USER_PROFILE_SELECT)
    .eq('auth_user_id', normalizedAuthUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getCurrentUserProfile() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user?.id) {
    return null;
  }

  return getUserProfileByAuthUserId(session.user.id);
}

export async function login({ employeeId, password }) {
  const normalizedEmployeeId = toTrimmedString(employeeId).replace(/\s+/g, '');
  const authEmail = buildAuthEmail(employeeId);
  const normalizedPassword = toTrimmedString(password);

  if (!normalizedEmployeeId || !normalizedPassword) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: normalizedPassword,
  });

  if (error || !session?.user?.id) {
    return null;
  }

  return getUserProfileByAuthUserId(session.user.id);
}

export async function register(form) {
  const metadata = Object.fromEntries(
    Object.entries({
      nhName: form?.nhName,
      officeName: form?.officeName,
      businessCode: form?.businessCode,
      name: form?.name,
      employeeId: form?.employeeId,
    }).map(([key, value]) => [
      key,
      key === 'employeeId'
        ? toTrimmedString(value).replace(/\s+/g, '')
        : toTrimmedString(value),
    ]),
  );
  const normalizedPassword = toTrimmedString(form?.password);

  if (
    !metadata.nhName ||
    !metadata.officeName ||
    !metadata.businessCode ||
    !metadata.name ||
    !metadata.employeeId ||
    !normalizedPassword
  ) {
    return { status: 'invalid' };
  }

  const authEmail = buildAuthEmail(metadata.employeeId);

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: normalizedPassword,
    options: {
      data: {
        nh_name: metadata.nhName,
        office_name: metadata.officeName,
        office_code: metadata.businessCode,
        name: metadata.name,
        employee_id: metadata.employeeId,
      },
    },
  });

  if (
    (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) ||
    /already registered/i.test(toLowerTrimmedString(error?.message))
  ) {
    return { status: 'duplicate' };
  }

  if (error) {
    throw error;
  }

  return {
    status: 'success',
    authUserId: data?.user?.id ?? null,
  };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
