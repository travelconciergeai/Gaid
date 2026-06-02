// ============================================================================
// Gaid Production — STORE
// ----------------------------------------------------------------------------
//  • useQuery(fetcher, deps)  — runs a tripApi call → { status, data, reload }
//    status ∈ loading | empty | error | success   (resolved INTERNALLY; there
//    is no visual state-control bar anywhere).
//  • SessionProvider / useAccount — auth + user + TravelProfile only. Keeps the
//    SAME surface ui.jsx/screens already use (acct.user, acct.profile, login…),
//    so the approved components work untouched. Persisted to localStorage.
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
const SESS_KEY = 'gaid:prod:session:v1';
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

const SessionProvider = ({ children }) => {
  const [sess, setSess] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(SESS_KEY)) || emptySession(); }
    catch { return emptySession(); }
  });
  React.useEffect(() => { try { localStorage.setItem(SESS_KEY, JSON.stringify(sess)); } catch {} }, [sess]);
  const update = (patch) => setSess(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));

  const actions = React.useMemo(() => ({
    login: ({ email } = {}) => {
      const nm = nameFromEmail(email);
      setSess({ ...emptySession(), authed: true, needsOnboarding: true,
        user: { ...emptySession().user, email: email || '', name: nm, firstName: firstNameFrom(nm) } });
    },
    finishOnboarding: (profile) => update({ needsOnboarding: false, profile: profile || null }),
    setProfile: (profile) => update({ profile }),
    editProfile: () => update({ needsOnboarding: true }),
    logout: () => setSess(emptySession()),
  }), []);

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
  const summaries = (q.data || []).map(toTripSummary).filter(s => TRIP_VISIBLE.has(s._status));
  return { ...q, summaries };
}
// Active trip detail → TripDetail | null
function useActiveTripDetail() {
  const { activeTripId } = useActiveTrip();
  const q = useQuery(() => (activeTripId ? tripApi.getTrip(activeTripId) : Promise.resolve(null)), [activeTripId]);
  return { ...q, trip: q.data ? toTripDetail(q.data) : null, activeTripId };
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

Object.assign(window, {
  useQuery,
  SessionProvider, useAccount, firstNameFrom, deriveTraits, profileCompletion,
  ActiveTripProvider, useActiveTrip,
  TripStoreProvider, useTripStore,
  useTrips, useActiveTripDetail, useCatalog,
});
