import { createClient } from '@supabase/supabase-js';

let adminClient = null;

function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  adminClient = createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

export function hasBrainConfig() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function queryBrain({ query, destination, category, limit = 8 }) {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { entries: [], source: 'unconfigured' };
  }

  let destSlug = null;
  if (destination) {
    const normalized = destination.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    destSlug = normalized;
  }

  const { data, error } = await sb.rpc('search_brain', {
    query_text: query || '',
    dest_slug: destSlug,
    cat: category || null,
    lim: limit,
  });

  if (error) {
    const fallback = await sb
      .from('brain_knowledge')
      .select('*, experts(name, slug), destinations(name, slug)')
      .eq('is_published', true)
      .ilike('content', `%${query || ''}%`)
      .limit(limit);

    if (fallback.error) throw fallback.error;
    return { entries: fallback.data || [], source: 'fallback' };
  }

  return { entries: data || [], source: 'brain' };
}

export async function listExperts({ limit = 20 } = {}) {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from('experts')
    .select('*')
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listExpertPackages({ destination, limit = 20 } = {}) {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  let q = sb
    .from('expert_packages')
    .select('*, experts(name, slug, avatar_url), destinations(name, slug)')
    .eq('is_published', true)
    .order('sales_count', { ascending: false })
    .limit(limit);
  if (destination) {
    q = q.ilike('title', `%${destination}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export function formatBrainContext(entries = []) {
  if (!entries.length) return '';
  return entries.map((e, i) => {
    const expert = e.experts?.name || e.expert_name || 'Expert Voia';
    const dest = e.destinations?.name || '';
    return `[${i + 1}] (${e.category}${dest ? ` · ${dest}` : ''}) ${e.title} — ${e.content}${e.place_name ? ` · Local: ${e.place_name}` : ''} · por ${expert}`;
  }).join('\n');
}
