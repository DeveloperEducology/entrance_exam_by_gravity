const USER_KEY = 'wexls_local_user';
const listeners = new Set();

function readUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeUser(user) {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    // document.cookie = "wexls_user_id=; path=/; max-age=0"; // API should handle this too if we want, but let's keep it sync'd for client logic
  } else {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

function emitAuth(event, user) {
  const session = user ? { user } : null;
  for (const listener of listeners) {
    try {
      listener(event, session);
    } catch { }
  }
}

function buildUser(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const safeEmail = normalizedEmail || 'learner@example.com';
  const baseId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `user_${Date.now()}`;
  return {
    id: baseId,
    email: safeEmail,
    user_metadata: {
      name: safeEmail.split('@')[0],
    },
  };
}

export function createClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }) {
        if (typeof window === 'undefined') return { error: { message: 'Server context' } };
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');

          writeUser(data.user);
          emitAuth('SIGNED_IN', data.user);
          return { data: { user: data.user, session: { user: data.user } }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      async signUp({ email, password, name, birthYear, gradeId, role }) {
        if (typeof window === 'undefined') return { error: { message: 'Server context' } };
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, birthYear, gradeId, role }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Registration failed');

          writeUser(data.user);
          emitAuth('SIGNED_IN', data.user);
          return { data: { user: data.user, session: { user: data.user } }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      async getUser() {
        const user = readUser();
        return { data: { user }, error: null };
      },
      onAuthStateChange(callback) {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      async signOut() {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          console.error('Logout error:', e);
        }
        writeUser(null);
        emitAuth('SIGNED_OUT', null);
        return { error: null };
      },
    },
  };
}
