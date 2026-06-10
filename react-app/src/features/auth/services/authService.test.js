import { afterEach, describe, expect, it, vi } from 'vitest';

import supabase from '../../../lib/supabaseClient';
import {
  buildAuthEmail,
  getCurrentUserProfile,
  getUserProfileByAuthUserId,
  login,
  logout,
  register,
} from './authService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('authService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds a deterministic internal auth email from employeeId', () => {
    expect(buildAuthEmail(' 1001 ')).toBe('1001@auth.nh-agri.local');
    expect(buildAuthEmail('AB 12')).toBe('ab12@auth.nh-agri.local');
  });

  it('signs in with the derived auth email and resolves the current login user profile', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'auth-user-1',
          },
        },
      },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 7,
        auth_user_id: 'auth-user-1',
        name: 'User One',
        nh_name: 'NH',
        office_name: 'Main Office',
        office_code: 'A001',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockReturnValue({ select });

    const result = await login({
      employeeId: '1001',
      password: 'secret',
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: '1001@auth.nh-agri.local',
      password: 'secret',
    });
    expect(select).toHaveBeenCalledWith(
      'id, auth_user_id, name, nh_name, office_name, office_code',
    );
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        office_code: 'A001',
      }),
    );
  });

  it('returns null when credentials are invalid', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await login({
      employeeId: '1001',
      password: 'wrong-password',
    });

    expect(result).toBeNull();
  });

  it('registers a new auth user with current-project metadata and signs out the auto-created session', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-2',
          identities: [{ id: 'identity-1' }],
        },
      },
      error: null,
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const result = await register({
      nhName: 'NH',
      officeName: 'Main Office',
      businessCode: 'A001',
      name: 'User One',
      employeeId: '1001',
      password: 'secret',
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: '1001@auth.nh-agri.local',
      password: 'secret',
      options: {
        data: {
          nh_name: 'NH',
          office_name: 'Main Office',
          office_code: 'A001',
          name: 'User One',
          employee_id: '1001',
        },
      },
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'success',
      authUserId: 'auth-user-2',
    });
  });

  it('returns a duplicate status when the auth identity already exists', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-2',
          identities: [],
        },
      },
      error: null,
    });

    const result = await register({
      nhName: 'NH',
      officeName: 'Main Office',
      businessCode: 'A001',
      name: 'User One',
      employeeId: '1001',
      password: 'secret',
    });

    expect(result).toEqual({ status: 'duplicate' });
  });

  it('loads the current user profile from the active auth session', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'auth-user-3',
          },
        },
      },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 10,
        auth_user_id: 'auth-user-3',
        name: 'User Three',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockReturnValue({ select });

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      id: 10,
      auth_user_id: 'auth-user-3',
      name: 'User Three',
    });
  });

  it('signs out explicitly on logout', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    await logout();

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('can fetch a profile directly by auth user id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 8, auth_user_id: 'auth-user-8' },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    supabase.from.mockReturnValue({ select });

    const result = await getUserProfileByAuthUserId('auth-user-8');

    expect(result).toEqual({ id: 8, auth_user_id: 'auth-user-8' });
  });
});
