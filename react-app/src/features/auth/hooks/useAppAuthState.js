import { useEffect, useState } from 'react';

import supabase from '../../../lib/supabaseClient';
import {
  getCurrentUserProfile,
  getUserProfileByAuthUserId,
  logout as requestLogout,
} from '../services/authService';

export function useAppAuthState(isEnabled = true) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(isEnabled);

  useEffect(() => {
    if (!isEnabled) {
      setUser(null);
      setIsLoading(false);
      return undefined;
    }

    let isActive = true;

    async function syncProfile(authUserId) {
      try {
        const profile = await getUserProfileByAuthUserId(authUserId);

        if (!isActive) {
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('[Auth] Failed to refresh login user profile.', error);

        if (!isActive) {
          return;
        }

        setUser(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    async function bootstrap() {
      setIsLoading(true);

      try {
        const profile = await getCurrentUserProfile();

        if (!isActive) {
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('[Auth] Failed to bootstrap auth state.', error);

        if (!isActive) {
          return;
        }

        setUser(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user?.id) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      void syncProfile(session.user.id);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [isEnabled]);

  async function handleLogout() {
    await requestLogout();
    setUser(null);
  }

  function handleLogin(nextUser) {
    setUser(nextUser);
    setIsLoading(false);
  }

  return {
    user,
    isLoading,
    handleLogin,
    handleLogout,
  };
}
