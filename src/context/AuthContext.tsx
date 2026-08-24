import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/config';
import type { AppUser, PermissionKey } from '../types';
import { loadProfile, loginWithGoogle, loginWithStudentCode, logout } from '../services/authService';

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

interface AuthContextValue {
  authUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInAsStudent: (studentCode: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  can: (permission: PermissionKey) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    try {
      const next = await withTimeout(loadProfile(user.id), 12000, 'Tải hồ sơ quá lâu, vui lòng thử lại.');
      setProfile(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ.');
    }
  }, []);

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | undefined;
    let classChannel: ReturnType<typeof supabase.channel> | undefined;

    async function bindRealtime(userId: string) {
      profileChannel?.unsubscribe();
      classChannel?.unsubscribe();

      profileChannel = supabase
        .channel(`profile-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
          void refreshProfile();
        })
        .subscribe();

      classChannel = supabase
        .channel(`user-classes-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_classes', filter: `user_id=eq.${userId}` }, () => {
          void refreshProfile();
        })
        .subscribe();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      setError(null);

      if (!user) {
        setProfile(null);
        profileChannel?.unsubscribe();
        classChannel?.unsubscribe();
        setLoading(false);
        return;
      }

      try {
        const next = await withTimeout(loadProfile(user.id), 12000, 'Tải tài khoản quá lâu — có thể do mạng chập chờn hoặc trình duyệt còn giữ phiên từ tab cũ. Hãy đóng hết các tab khác của trang này rồi thử lại.');
        setProfile(next);
        await bindRealtime(user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải tài khoản.');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      profileChannel?.unsubscribe();
      classChannel?.unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    authUser,
    profile,
    loading,
    error,
    signIn: loginWithGoogle,
    signInAsStudent: loginWithStudentCode,
    signOutUser: logout,
    can: (permission) => Boolean(
      profile?.isApproved && profile?.isActive &&
      (profile.role === 'admin' || profile.permissions?.[permission])
    ),
    refreshProfile
  }), [authUser, profile, loading, error, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider.');
  return value;
}
