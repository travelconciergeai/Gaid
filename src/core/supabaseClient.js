const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SESSION_KEY = 'gaid:supabase:session';

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const authHeaders = (accessToken) => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
  'Content-Type': 'application/json',
});

const readStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
};

const writeStoredSession = (session) => {
  try {
    session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY);
  } catch {}
};

const request = async (path, options = {}) => {
  if (!hasSupabaseConfig) throw new Error('Supabase environment variables are missing.');
  const response = await fetch(`${supabaseUrl}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.error || 'Supabase request failed.');
  }
  return data;
};

const getProfile = async (userId, accessToken) => {
  if (!userId) return null;
  const rows = await request(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`, {
    headers: authHeaders(accessToken),
  });
  return rows?.[0] || null;
};

const updateProfile = async (userId, patch, accessToken) => {
  if (!userId) return null;
  const rows = await request(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(patch),
  });
  return rows?.[0] || null;
};

const signInWithPassword = async ({ email, password }) => {
  const data = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
  };
  writeStoredSession(session);
  return { data: { session, user: data.user }, error: null };
};

const signOut = async () => {
  const session = readStoredSession();
  if (session?.access_token && hasSupabaseConfig) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: authHeaders(session.access_token),
    }).catch(() => null);
  }
  writeStoredSession(null);
  return { error: null };
};

const getSession = async () => ({ data: { session: readStoredSession() }, error: null });

const onAuthStateChange = () => ({
  data: {
    subscription: {
      unsubscribe() {},
    },
  },
});

const supabase = {
  auth: {
    getSession,
    signInWithPassword,
    signOut,
    onAuthStateChange,
  },
  profiles: {
    getProfile,
    updateProfile,
  },
};

export { supabase, hasSupabaseConfig };
