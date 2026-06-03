import React from 'react';
import { tripApi } from './tripApi.jsx';
import { has, TRIP_VISIBLE } from './contracts.jsx';
import { toTripSummary, toTripDetail } from './projections.jsx';
import { supabase, hasSupabaseConfig } from './supabaseClient.js';
// ============================================================================
// Gaid Production — STORE
// ----------------------------------------------------------------------------
//  • useQuery(fetcher, deps)  — runs a tripApi call → { status, data, reload }
//    status ∈ loading | empty | error | success   (resolved INTERNALLY; there
//    is no visual state-control bar anywhere).
//  • SessionProvider / useAccount — auth + user + TravelProfile only. Keeps the
//    SAME surface ui.jsx/screens already use (acct.user, acct.profile, login…),
//    now backed by Supabase Auth.
//  • ActiveTripProvider / useActiveTrip — holds ONLY activeTripId.
//  • TripStoreProvider — the single cache of trips; selectors return projections.
//
// Empty-first: a fresh session has no profile and no trips. Nothing is faked.
// ============================================================================

// ---------------- useQuery: the only way the UI reads remote data ----------------
function useQuery(fetcher, deps = []) {
  const [state, setState] = React.useState({ status: 'loading', data: null, error: null });
  const [tick, setTick] = React.useState(0);
  const reload = React.useCallback(() => setTick(t => t + 1), []);
  React.useEffect(() => {
    let alive = true;
    setState({ status: 'loading', data: null, error: null });
    Promise.resolve(fetcher())
      .then(data => { if (alive) setState({ status: has(data) ? 'success' : 'empty', data, error: null }); })
      .catch(err => { if (alive) setState({ status: 'error', data: null, error: { message: String(err && err.message || err) } }); });
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [tick, ...deps]);
  return { ...state, reload };
}

// ---------------- Session (auth + user + travel profile) ----------------
const AccountContext = React.createContext(null);
const useAccount = () => React.useContext(AccountContext);

function emptySession() {
  return {
    authed: false,
    needsOnboarding: false,
    profile: null,                 // TravelProfile — null until onboarding
    user: { name: '', firstName: '', handle: '', tier: 'Convidado', email: '', avatar: null, miles: 0 },
    // Wallet / miles domains — empty-first (wired to backend later, like trips).
    cards: [],
    benefits: [],
    milesPrograms: [],
  };
}
function firstNameFrom(name) { return name ? name.trim().split(/\s+/)[0] : ''; }

// TravelProfile → ordered trait rows the Profile shows (null if nothing set).
function deriveTraits(profile) {
  if (!profile) return null;
  const rows = [
    { key: 'companhia', icon: 'Users',    label: 'Companhia', chips: profile.travelCompanions || [] },
    { key: 'estilo',    icon: 'Sparkles', label: 'Estilo',    chips: profile.travelStyles || [] },
    { key: 'destinos',  icon: 'MapPin',   label: 'Destinos',  chips: profile.favoriteDestinations || [] },
    { key: 'orcamento', icon: 'Coins',    label: 'Orçamento', chips: profile.budgetRange ? [profile.budgetRange] : [] },
    { key: 'hoteis',    icon: 'Bed',      label: 'Hotéis',    chips: profile.hotelPreferences || [] },
    { key: 'milhas',    icon: 'Plane',    label: 'Milhas',    chips: (profile.usesMiles === 'Sim' ? (profile.milesPrograms || []) : []) },
  ];
  const filled = rows.filter(r => r.chips.length > 0);
  return filled.length ? rows : null;
}
function profileCompletion(profile) {
  if (!profile) return 0;
  const checks = [
    (profile.travelCompanions || []).length,
    (profile.travelStyles || []).length,
    (profile.favoriteDestinations || []).length,
    profile.budgetRange ? 1 : 0,
    (profile.hotelPreferences || []).length,
    profile.usesMiles ? 1 : 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
function nameFromEmail(email) {
  if (!email) return '';
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local.replace(/\b\w/g, c => c.toUpperCase());
}
function sessionFromUser(user, profile = null) {
  const nm = profile?.display_name || user?.user_metadata?.name || user?.user_metadata?.full_name || nameFromEmail(user?.email);
  return {
    ...emptySession(),
    authed: Boolean(user),
    needsOnboarding: !profile,
    profile,
    user: {
      ...emptySession().user,
      email: user?.email || profile?.email || '',
      name: nm || '',
      firstName: firstNameFrom(nm),
      avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
    },
  };
}

const SessionProvider = ({ children }) => {
  const [sess, setSess] = React.useState(emptySession);
  const [authSession, setAuthSession] = React.useState(null);
  const update = (patch) => setSess(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));

  const loadSupabaseSession = React.useCallback(async (session) => {
    const user = session?.user;
    if (!user) {
      setAuthSession(null);
      setSess(emptySession());
      return;
    }
    setAuthSession(session);
    let profile = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = data || null;
    } catch (_error) {
      profile = null;
    }
    setSess(sessionFromUser(user, profile));
  }, []);

  React.useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) loadSupabaseSession(data?.session || null);
    }).catch(() => {
      if (alive) setSess(emptySession());
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSupabaseSession(session).catch(() => setSess(emptySession()));
    });
    return () => {
      alive = false;
      data?.subscription?.unsubscribe?.();
    };
  }, [loadSupabaseSession]);

  const actions = React.useMemo(() => ({
    login: async ({ email, password } = {}) => {
      if (!hasSupabaseConfig) throw new Error('Supabase environment variables are missing.');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadSupabaseSession(data?.session || null);
      return data;
    },
    finishOnboarding: async (profile) => {
      let nextProfile = profile || null;
      if (authSession?.user && authSession?.access_token) {
        try {
          const { data } = await supabase
            .from('profiles')
            .update({ display_name: sess.user.name || null })
            .eq('user_id', authSession.user.id)
            .select('*')
            .maybeSingle();
          nextProfile = data || nextProfile;
        } catch (_error) {}
      }
      update({ needsOnboarding: false, profile: nextProfile });
    },
    setProfile: (profile) => update({ profile }),
    editProfile: () => update({ needsOnboarding: true }),
    logout: async () => {
      await supabase.auth.signOut();
      setAuthSession(null);
      setSess(emptySession());
    },
  }), [authSession, loadSupabaseSession, sess.user.name]);

  const value = React.useMemo(() => ({ ...sess, ...actions }), [sess, actions]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

// ---------------- ActiveTripContext: ONLY the id ----------------
const AT_KEY = 'gaid:prod:activeTripId:v1';
const ActiveTripContext = React.createContext(null);
const useActiveTrip = () => React.useContext(ActiveTripContext);

const ActiveTripProvider = ({ children }) => {
  const [activeTripId, _set] = React.useState(() => { try { return localStorage.getItem(AT_KEY) || null; } catch { return null; } });
  const setActiveTripId = React.useCallback((id) => {
    _set(id);
    try { id ? localStorage.setItem(AT_KEY, id) : localStorage.removeItem(AT_KEY); } catch {}
  }, []);
  const value = React.useMemo(() => ({ activeTripId, setActiveTripId }), [activeTripId, setActiveTripId]);
  return <ActiveTripContext.Provider value={value}>{children}</ActiveTripContext.Provider>;
};

// ---------------- TripStore: the single trip cache ----------------
// Selectors return PROJECTIONS (see projections.jsx), never the raw Trip.
const TripStoreContext = React.createContext(null);
const useTripStore = () => React.useContext(TripStoreContext);

const TripStoreProvider = ({ children }) => {
  const [byId, setById] = React.useState({});        // { [tripId]: Trip }
  const put = React.useCallback((trip) => {
    if (!trip || !trip.id) return;
    setById(prev => ({ ...prev, [trip.id]: trip }));
  }, []);
  const value = React.useMemo(() => ({
    byId, put,
    // actions — single way to mutate a trip; each returns the updated Trip
    createTrip: async (input) => { const t = await tripApi.createTrip(input); if (t) put(t); return t; },
    createTripFromTemplate: async (id) => { const t = await tripApi.createTripFromTemplate(id); if (t) put(t); return t; },
    applyHotel: async (tripId, hotelId, nights) => { const t = await tripApi.applyHotel(tripId, hotelId, nights); if (t) put(t); return t; },
    applyFlight: async (tripId, flightId, dayId) => { const t = await tripApi.applyFlight(tripId, flightId, dayId); if (t) put(t); return t; },
    applyTour: async (tripId, tourId, dayId, slot) => { const t = await tripApi.applyTour(tripId, tourId, dayId, slot); if (t) put(t); return t; },
    patchItinerary: async (tripId, ops) => { const t = await tripApi.patchTrip(tripId, ops); if (t) put(t); return t; },
  }), [byId, put]);
  return <TripStoreContext.Provider value={value}>{children}</TripStoreContext.Provider>;
};

// ---------------- Read hooks the screens use ----------------
// Trips list → TripSummary[] (visible statuses only)
function useTrips() {
  const q = useQuery(() => tripApi.listTrips(), []);
  const summaries = (q.data || []).map(toTripSummary).filter(Boolean).filter(s => TRIP_VISIBLE.has(s._status));
  return { ...q, summaries };
}
// Active trip detail → TripDetail | null
function useActiveTripDetail() {
  const { activeTripId, setActiveTripId } = useActiveTrip();
  const store = useTripStore();
  const q = useQuery(async () => {
    if (!activeTripId) return null;
    try {
      const trip = await tripApi.getTrip(activeTripId);
      if (!trip) setActiveTripId(null);
      if (trip) store.put(trip);
      return trip;
    } catch (_error) {
      setActiveTripId(null);
      return null;
    }
  }, [activeTripId]);
  const current = activeTripId ? (store.byId[activeTripId] || q.data) : null;
  return { ...q, trip: current ? toTripDetail(current) : null, activeTripId };
}
// Generic catalog hook for carousels: useCatalog('hotels') etc.
const _catalogFetch = {
  hotels:    (p) => tripApi.searchHotels(p),
  flights:   (p) => tripApi.searchFlights(p),
  tours:     (p) => tripApi.searchTours(p),
  templates: (p) => tripApi.listTemplates(p),
  experts:   (p) => tripApi.listExperts(p),
  plans:     ( ) => tripApi.listPlans(),
};
function useCatalog(kind, params) {
  return useQuery(() => (_catalogFetch[kind] ? _catalogFetch[kind](params) : Promise.resolve([])), [kind, JSON.stringify(params || null)]);
}


export { useQuery, SessionProvider, useAccount, firstNameFrom, deriveTraits, profileCompletion, ActiveTripProvider, useActiveTrip, TripStoreProvider, useTripStore, useTrips, useActiveTripDetail, useCatalog };
