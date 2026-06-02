// ============================================================================
// Gaid Production — EDITORIAL BANK (preset content from "o banco")
// ----------------------------------------------------------------------------
// Discovery areas (Explorar + "Roteiros sugeridos") read curated content from
// here, BEHIND the tripApi SEAM (components stay decoupled). Until marketing /
// comercial produces the real content, experts and templates are EMPTY — the
// screens fall back to honest empty states. Nothing fictional is shown as real.
//
// Search areas (hotels / flights / tours) stay empty until a real search.
// ============================================================================

// Experts — EMPTY until the 3 real experts are registered by comercial.
// Shape each real expert must follow (backend-ready, do NOT invent values):
//   { id, portrait, name, region, regions:[], specs:[], bio, quote,
//     rating, trips, routes, responseMin, years, tone }
const EDITORIAL_EXPERTS = [];

// Templates — EMPTY until real, curated routes are produced by marketing.
// A TripTemplate sells the IDEA of a trip (curadoria); price/cost belongs to a
// real Trip quote, never to a template. Shape (backend-ready):
//   { id, title, category, days, description, tone }   // no fictional price/expert
const EDITORIAL_TEMPLATES = [];

// Destinations — curated editorial base (NOT availability/transactional data).
// Single local source of truth for destination options, grouped by region.
// Onboarding and future screens read from here. When the backend owns this,
// `listDestinations()` becomes a real call returning the same grouped shape.
const EDITORIAL_DESTINATIONS = {
  Brasil:  ['Rio', 'Nordeste', 'Gramado', 'Foz'],
  América: ['Orlando', 'Buenos Aires', 'Nova York', 'Santiago'],
  Europa:  ['Paris', 'Londres', 'Roma', 'Madri', 'Portugal'],
  Ásia:    ['Japão', 'Coreia', 'Tailândia'],
};

// Wire the editorial bank into the seam. Discovery endpoints serve curated
// content; search endpoints stay empty (real APIs fill them later).
tripApi.__useBackend({
  async listTemplates(_q) { return EDITORIAL_TEMPLATES; },
  async getTemplate(id)   { return EDITORIAL_TEMPLATES.find(t => t.id === id) || null; },
  async listExperts(_q)   { return EDITORIAL_EXPERTS; },
  async listDestinations(_q) { return EDITORIAL_DESTINATIONS; },
});

Object.assign(window, { EDITORIAL_EXPERTS, EDITORIAL_TEMPLATES, EDITORIAL_DESTINATIONS });
