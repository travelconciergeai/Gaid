// ============================================================================
// Gaid Production — tripApi (THE SEAM)
// ----------------------------------------------------------------------------
// The ONE place data enters the app. Every screen reads through here (via the
// store/hooks); no component imports a catalog or fixture.
//
//   ┌───────────────────────────────────────────────────────────────────┐
//   │  BACKEND PLUGS IN HERE — this week.                                 │
//   │  Each method currently resolves EMPTY (the product starts zeroed).  │
//   │  Replace each body with a real fetch(...) keeping the SAME return    │
//   │  shape (see docs 03 + 10). No screen/component changes required.     │
//   └───────────────────────────────────────────────────────────────────┘
//
// `tripApi.__useBackend(adapter)` lets the integration swap all methods at once
// (e.g. point them at REST). Until then everything is empty → approved empty
// states render. NOTHING is fabricated to fill the UI.
// ============================================================================

const _net = (ms = 420) => new Promise(r => setTimeout(r, ms));   // simulate latency for skeletons

// Default adapter: the product, zeroed. Every collection empty, every lookup null.
const _emptyAdapter = {
  // viagens (Trip = fonte da verdade)
  async listTrips() { return []; },
  async getTrip(_id) { return null; },
  async createTrip(_input) { return null; },
  async createTripFromTemplate(_templateId) { return null; },
  async patchTrip(_id, _ops) { return null; },
  async applyHotel(_tripId, _hotelId, _nights) { return null; },
  async applyFlight(_tripId, _flightId, _dayId) { return null; },
  async applyTour(_tripId, _tourId, _dayId, _slot) { return null; },
  // catálogo / busca (carrosséis)
  async searchHotels(_q) { return []; },
  async searchFlights(_q) { return []; },
  async searchTours(_q) { return []; },
  async listTemplates(_q) { return []; },     // roteiros sugeridos
  async getTemplate(_id) { return null; },
  async listExperts(_q) { return []; },
  async listPlans() { return []; },
  async listDestinations(_q) { return {}; },     // curated destinations (grouped by region)
  // perfil / sessão (TravelProfile vem do onboarding; backend confirma)
  async getTravelProfile() { return null; },
};

let _adapter = _emptyAdapter;

const tripApi = new Proxy({}, {
  get(_t, key) {
    if (key === '__useBackend') {
      return (adapter) => { _adapter = { ..._emptyAdapter, ...adapter }; };
    }
    if (key === '__reset') return () => { _adapter = _emptyAdapter; };
    const fn = _adapter[key];
    if (typeof fn !== 'function') return undefined;
    // wrap so every call has a tiny latency (drives loading skeletons honestly)
    return async (...args) => { await _net(); return fn(...args); };
  },
});


export { tripApi };
