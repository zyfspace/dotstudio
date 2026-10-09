export interface AuthUser {
  id: string;
  name: string;
  studioName?: string;
  email: string;
  createdAt: string;
}

export const AUTH_SESSION_KEY = 'studio-auth-session';
export const AUTH_USERS_KEY = 'studio-users-list';

// Pre-registered master account with dual-identity (Faiz Dawami + Zyf.Space)
export const DEFAULT_USER: { user: AuthUser; passwordHash: string } = {
  user: {
    id: 'usr_zyfxspace',
    name: 'Faiz Dawami',
    studioName: 'Zyf.Space',
    email: 'zyfxspace@gmail.com',
    createdAt: '2026-10-09T00:00:00.000Z',
  },
  passwordHash: '11januari',
};

// Load list of registered users
export const getRegisteredUsers = (): Array<{ user: AuthUser; passwordHash: string }> => {
  if (typeof window === 'undefined') return [DEFAULT_USER];
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default user is always present
        const hasDefault = parsed.some(
          (u) => u.user.email.toLowerCase() === DEFAULT_USER.user.email.toLowerCase()
        );
        if (!hasDefault) {
          parsed.unshift(DEFAULT_USER);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse registered users', e);
  }
  return [DEFAULT_USER];
};

// Save list of registered users
export const saveRegisteredUsers = (users: Array<{ user: AuthUser; passwordHash: string }>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save registered users', e);
  }
};

// Check if there is an active logged-in session
export const getActiveSession = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.email) return user;
    }
  } catch (e) {
    console.error('Failed to load auth session', e);
  }
  return null;
};

// Set logged-in session
export const setAuthSession = (user: AuthUser | null, rememberMe: boolean = true) => {
  if (typeof window === 'undefined') return;
  try {
    if (user && rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to set auth session', e);
  }
};

// Login verification
export const verifyLogin = (
  email: string,
  pass: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  const users = getRegisteredUsers();
  const match = users.find(
    (u) => u.user.email.toLowerCase() === cleanEmail
  );

  if (!match) {
    return { success: false, error: 'This email not registered yet.' };
  }

  if (match.passwordHash !== cleanPass) {
    return { success: false, error: 'You entered wrong password.' };
  }

  return { success: true, user: match.user };
};

// Sign Up registration
export const registerUser = (
  name: string,
  email: string,
  pass: string,
  studioName?: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanStudioName = (studioName || '').trim();
  const cleanPass = pass.trim();

  const users = getRegisteredUsers();
  const exists = users.some(
    (u) => u.user.email.toLowerCase() === cleanEmail
  );

  if (exists) {
    return { success: false, error: 'This email is already registered. Please log in.' };
  }

  const newUser: AuthUser = {
    id: `usr_${Date.now()}`,
    name: cleanName || 'Studio Owner',
    studioName: cleanStudioName || 'Studio',
    email: cleanEmail,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, { user: newUser, passwordHash: cleanPass }];
  saveRegisteredUsers(updatedUsers);

  return { success: true, user: newUser };
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
      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || cleanName || 'Studio Owner',
        studioName: data.user.user_metadata?.studio_name || cleanStudioName || '',
        email: cleanEmail,
        createdAt: data.user.created_at || new Date().toISOString(),
      };
      registerUser(authUser.name, authUser.email, pass, authUser.studioName);
      setAuthSession(authUser);
      return { success: true, requiresOtp: false, user: authUser };
    }

    // Requires OTP verification
    return { success: true, requiresOtp: true };
  } catch (e: any) {
    // Local fallback in case network / mock
    const res = registerUser(cleanName, cleanEmail, pass, cleanStudioName);
    return { ...res, requiresOtp: false };
  }
};

// Supabase Verify OTP 6-Digit Code
export const verifyOtpWithSupabase = async (
  email: string,
  token: string,
  name?: string,
  studioName?: string,
  pass?: string
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

    const sbUser = data.user;
    const authUser: AuthUser = {
      id: sbUser?.id || `usr_${Date.now()}`,
      name: sbUser?.user_metadata?.full_name || name || 'Studio Owner',
      studioName: sbUser?.user_metadata?.studio_name || studioName || '',
      email: cleanEmail,
      createdAt: sbUser?.created_at || new Date().toISOString(),
    };

    if (pass) {
      registerUser(authUser.name, authUser.email, pass, authUser.studioName);
    }
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

