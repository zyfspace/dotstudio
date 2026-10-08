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
