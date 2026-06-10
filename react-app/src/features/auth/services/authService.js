import { toLowerTrimmedString, toTrimmedString } from '../../../common/utils/text';
import supabase from '../../../lib/supabaseClient';

const LOGIN_USER_PROFILE_SELECT = 'id, auth_user_id, name, nh_name, office_name, office_code';
const AUTH_EMAIL_DOMAIN = 'auth.nh-agri.local';

function normalizeEmployeeId(employeeId) {
  return toTrimmedString(employeeId).replace(/\s+/g, '');
}

export function buildAuthEmail(employeeId) {
  const normalizedEmployeeId = normalizeEmployeeId(employeeId)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-');

  if (!normalizedEmployeeId) {
    return '';
  }

  return `${normalizedEmployeeId}@${AUTH_EMAIL_DOMAIN}`;
}

function buildRegisterMetadata({
  nhName,
  officeName,
  businessCode,
  name,
  employeeId,
}) {
  return {
    nhName: toTrimmedString(nhName),
    officeName: toTrimmedString(officeName),
    businessCode: toTrimmedString(businessCode),
    name: toTrimmedString(name),
    employeeId: normalizeEmployeeId(employeeId),
  };
}

function isDuplicateAuthUserResponse(data, error) {
  if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
    return true;
  }

  return /already registered/i.test(toLowerTrimmedString(error?.message));
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
  const authEmail = buildAuthEmail(employeeId);
  const normalizedPassword = toTrimmedString(password);

  if (!authEmail || !normalizedPassword) {
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
  const metadata = buildRegisterMetadata(form);
  const authEmail = buildAuthEmail(metadata.employeeId);
  const normalizedPassword = toTrimmedString(form?.password);

  if (
    !metadata.nhName ||
    !metadata.officeName ||
    !metadata.businessCode ||
    !metadata.name ||
    !metadata.employeeId ||
    !normalizedPassword ||
    !authEmail
  ) {
    return { status: 'invalid' };
  }

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

  if (isDuplicateAuthUserResponse(data, error)) {
    return { status: 'duplicate' };
  }

  if (error) {
    throw error;
  }

  // When Confirm Email is disabled, signUp also creates a session.
  // Return to the explicit login flow so the UI stays predictable.
  await supabase.auth.signOut();

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
