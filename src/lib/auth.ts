export interface AuthUser {
  id: string;
  name: string;
  studioName?: string;
  email: string;
  createdAt: string;
}

export const AUTH_SESSION_KEY = 'studio-auth-session';
// Legacy client-side account list (stored plaintext passwords); removed on sign-in.
const LEGACY_USERS_KEY = 'studio-users-list';

export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours strict inactivity limit
export const SESSION_EXPIRED_FLAG = 'studio-session-expired';

export interface StoredSession {
  user: AuthUser;
  lastActive: number;
  expiresAt: number;
}

// Clear all active sessions across localStorage and Supabase
export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    import('./supabase').then(({ supabase }) => {
      supabase.auth.signOut().catch(() => {});
    });
  } catch (e) {
    console.error('Failed to clear auth session', e);
  }
};

// Touch session on activity to renew the 24-hour inactivity window
export const touchSession = () => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const user: AuthUser = parsed.user || (parsed.email ? parsed : null);
    if (!user) return;

    const now = Date.now();
    const payload: StoredSession = {
      user,
      lastActive: now,
      expiresAt: now + SESSION_EXPIRY_MS,
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to touch auth session', e);
  }
};

// Check if previous session was terminated due to timeout
export const checkAndConsumeExpiredNotice = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const flag = sessionStorage.getItem(SESSION_EXPIRED_FLAG);
    if (flag === '1') {
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      return true;
    }
  } catch (e) {
    console.error('Failed to check expired notice', e);
  }
  return false;
};

// Check if there is an active logged-in session (strictly verifies 24-hour inactivity)
export const getActiveSession = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const now = Date.now();

    // Check if session has lastActive/expiresAt timestamps
    if (parsed.lastActive && parsed.expiresAt) {
      const isExpired = now > parsed.expiresAt || (now - parsed.lastActive > SESSION_EXPIRY_MS);
      if (isExpired) {
        clearAuthSession();
        sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
        return null;
      }
      // Session is valid; refresh lastActive
      touchSession();
      return parsed.user;
    }

    // Legacy format upgrade (direct AuthUser without timestamps)
    if (parsed.email) {
      const user = parsed as AuthUser;
      const payload: StoredSession = {
        user,
        lastActive: now,
        expiresAt: now + SESSION_EXPIRY_MS,
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
      return user;
    }
  } catch (e) {
    console.error('Failed to load auth session', e);
  }
  return null;
};

// Set logged-in session with 24-hour expiration
export const setAuthSession = (user: AuthUser | null, rememberMe: boolean = true) => {
  if (typeof window === 'undefined') return;
  try {
    if (user && rememberMe) {
      const now = Date.now();
      const payload: StoredSession = {
        user,
        lastActive: now,
        expiresAt: now + SESSION_EXPIRY_MS,
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
    } else if (user) {
      // Not remembered: the Supabase session lasts until the next page load,
      // where the missing local session signs it out.
      localStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      clearAuthSession();
    }
  } catch (e) {
    console.error('Failed to set auth session', e);
  }
};


const toAuthUser = (
  user: { id: string; email?: string; created_at?: string; user_metadata?: Record<string, any> },
  fallback: { name?: string; studioName?: string; email: string }
): AuthUser => ({
  id: user.id,
  name: user.user_metadata?.full_name || user.user_metadata?.name || fallback.name || 'Studio Owner',
  studioName: user.user_metadata?.studio_name || fallback.studioName || '',
  email: (user.email || fallback.email).toLowerCase(),
  createdAt: user.created_at || new Date().toISOString(),
});

// Supabase email & password sign-in
export const signInWithSupabase = async (
  email: string,
  pass: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });
    if (error || !data.user) {
      return { success: false, error: 'Email or password incorrect.' };
    }
    try {
      localStorage.removeItem(LEGACY_USERS_KEY);
    } catch {}
    return { success: true, user: toAuthUser(data.user, { email: cleanEmail }) };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to sign in. Please try again.' };
  }
};

// Supabase Google OAuth Sign-in
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { supabase } = await import('./supabase');
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to initialize Google Sign-in.' };
  }
};

// Supabase Sign Up with Email & OTP
export const signUpWithSupabase = async (
  name: string,
  email: string,
  pass: string,
  studioName?: string
): Promise<{ success: boolean; requiresOtp?: boolean; user?: AuthUser; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanStudioName = (studioName || '').trim();

  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name: cleanName,
          studio_name: cleanStudioName,
        },
      },
    });

    if (error) {
      // If user already registered in Supabase
      return { success: false, error: error.message };
    }

    if (data.session && data.user) {
      const authUser = toAuthUser(data.user, { name: cleanName, studioName: cleanStudioName, email: cleanEmail });
      setAuthSession(authUser);
      return { success: true, requiresOtp: false, user: authUser };
    }

    // Requires OTP verification
    return { success: true, requiresOtp: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Registration failed. Please try again.' };
  }
};

// Supabase Verify OTP 6-Digit Code
export const verifyOtpWithSupabase = async (
  email: string,
  token: string,
  name?: string,
  studioName?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) {
      return { success: false, error: error.message || 'Kode verifikasi salah atau kedaluwarsa.' };
    }

    if (!data.user) {
      return { success: false, error: 'Kode verifikasi salah atau kedaluwarsa.' };
    }
    const authUser = toAuthUser(data.user, { name, studioName, email: cleanEmail });

    setAuthSession(authUser);
    return { success: true, user: authUser };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal memverifikasi kode.' };
  }
};

// Supabase Resend OTP Code
export const resendOtpWithSupabase = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal mengirim ulang kode.' };
  }
};

