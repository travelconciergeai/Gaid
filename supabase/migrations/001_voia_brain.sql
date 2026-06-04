-- ============================================================================
-- Voia — Schema do Cérebro (Supabase)
-- Conhecimento curado por experts + entidades da plataforma
-- ============================================================================

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Perfis (estende auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  travel_profile jsonb default '{}',
  subscription_plan text default 'free',
  trips_count   int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Viagens
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  destination   text,
  status        text default 'planning'
                check (status in ('planning','active','idea','completed','archived','draft')),
  trip_context  jsonb default '{}',
  metadata      jsonb default '{}',
  version       int default 1,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_status_idx on public.trips(status);

alter table public.trips enable row level security;

create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);
create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);
create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id);
create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Mensagens de chat por viagem
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  role        text not null check (role in ('user','assistant','system','tool')),
  content     text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

create index if not exists chat_messages_trip_id_idx on public.chat_messages(trip_id);

alter table public.chat_messages enable row level security;

create policy "chat_select_via_trip" on public.chat_messages
  for select using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );
create policy "chat_insert_via_trip" on public.chat_messages
  for insert with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Destinos canônicos
-- ---------------------------------------------------------------------------
create table if not exists public.destinations (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  country       text,
  country_code  text,
  iata_code     text,
  amadeus_city_code text,
  lat           double precision,
  lng           double precision,
  cover_image   text,
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

create index if not exists destinations_name_trgm on public.destinations using gin (name gin_trgm_ops);

alter table public.destinations enable row level security;
create policy "destinations_public_read" on public.destinations for select using (true);

-- ---------------------------------------------------------------------------
-- Experts da plataforma
-- ---------------------------------------------------------------------------
create table if not exists public.experts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  slug          text unique not null,
  name          text not null,
  bio           text,
  avatar_url    text,
  specialties   text[] default '{}',
  countries     text[] default '{}',
  verified      boolean default false,
  rating        numeric(3,2),
  trips_sold    int default 0,
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

alter table public.experts enable row level security;
create policy "experts_public_read" on public.experts for select using (true);

-- ---------------------------------------------------------------------------
-- Cérebro Voia — conhecimento curado por experts
-- ---------------------------------------------------------------------------
create table if not exists public.brain_knowledge (
  id            uuid primary key default uuid_generate_v4(),
  expert_id     uuid references public.experts(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  category      text not null
                check (category in (
                  'tip','restaurant','hotel','activity','route','warning',
                  'insider','transport','budget','season','family','general'
                )),
  title         text not null,
  content       text not null,
  tags          text[] default '{}',
  place_name    text,
  place_id      text,
  lat           double precision,
  lng           double precision,
  rating        numeric(3,2),
  price_range   text,
  best_season   text,
  source        text default 'expert',
  is_published  boolean default true,
  metadata      jsonb default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists brain_knowledge_category_idx on public.brain_knowledge(category);
create index if not exists brain_knowledge_destination_idx on public.brain_knowledge(destination_id);
create index if not exists brain_knowledge_tags_gin on public.brain_knowledge using gin (tags);
create index if not exists brain_knowledge_content_trgm on public.brain_knowledge using gin (content gin_trgm_ops);
create index if not exists brain_knowledge_title_trgm on public.brain_knowledge using gin (title gin_trgm_ops);

alter table public.brain_knowledge enable row level security;
create policy "brain_knowledge_public_read" on public.brain_knowledge
  for select using (is_published = true);

-- ---------------------------------------------------------------------------
-- Pacotes / roteiros de experts
-- ---------------------------------------------------------------------------
create table if not exists public.expert_packages (
  id            uuid primary key default uuid_generate_v4(),
  expert_id     uuid not null references public.experts(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  slug          text unique not null,
  title         text not null,
  description   text,
  duration_days int,
  price_from    numeric(12,2),
  currency      text default 'BRL',
  cover_image   text,
  itinerary     jsonb default '{}',
  tags          text[] default '{}',
  is_published  boolean default true,
  sales_count   int default 0,
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

alter table public.expert_packages enable row level security;
create policy "expert_packages_public_read" on public.expert_packages
  for select using (is_published = true);

-- ---------------------------------------------------------------------------
-- Avaliações de check-in
-- ---------------------------------------------------------------------------
create table if not exists public.place_reviews (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  trip_id       uuid references public.trips(id) on delete set null,
  place_name    text not null,
  place_id      text,
  lat           double precision,
  lng           double precision,
  rating        int check (rating between 1 and 5),
  review        text,
  photos        text[] default '{}',
  tags          text[] default '{}',
  is_public     boolean default true,
  created_at    timestamptz default now()
);

create index if not exists place_reviews_user_idx on public.place_reviews(user_id);
create index if not exists place_reviews_place_idx on public.place_reviews(place_id);

alter table public.place_reviews enable row level security;
create policy "place_reviews_select_public" on public.place_reviews
  for select using (is_public = true or auth.uid() = user_id);
create policy "place_reviews_insert_own" on public.place_reviews
  for insert with check (auth.uid() = user_id);
create policy "place_reviews_update_own" on public.place_reviews
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Alertas do Modo Viagem
-- ---------------------------------------------------------------------------
create table if not exists public.trip_alerts (
  id            uuid primary key default uuid_generate_v4(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  alert_type    text not null
                check (alert_type in ('weather','reminder','change','benefit','miles','general')),
  title         text not null,
  message       text not null,
  action_url    text,
  action_label  text,
  priority      text default 'normal' check (priority in ('low','normal','high','urgent')),
  is_read       boolean default false,
  metadata      jsonb default '{}',
  expires_at    timestamptz,
  created_at    timestamptz default now()
);

create index if not exists trip_alerts_trip_idx on public.trip_alerts(trip_id);

alter table public.trip_alerts enable row level security;
create policy "trip_alerts_via_trip" on public.trip_alerts
  for select using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );
create policy "trip_alerts_update_via_trip" on public.trip_alerts
  for update using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Trigger: atualizar updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger brain_knowledge_updated_at before update on public.brain_knowledge
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Função de busca no cérebro (full-text + trigram)
-- ---------------------------------------------------------------------------
create or replace function public.search_brain(
  query_text text,
  dest_slug text default null,
  cat text default null,
  lim int default 10
)
returns setof public.brain_knowledge
language sql stable as $$
  select bk.*
  from public.brain_knowledge bk
  left join public.destinations d on d.id = bk.destination_id
  where bk.is_published = true
    and (dest_slug is null or d.slug = dest_slug)
    and (cat is null or bk.category = cat)
    and (
      query_text is null
      or query_text = ''
      or bk.title ilike '%' || query_text || '%'
      or bk.content ilike '%' || query_text || '%'
      or query_text = any(bk.tags)
    )
  order by
    case when bk.title ilike query_text || '%' then 0 else 1 end,
    bk.rating desc nulls last,
    bk.created_at desc
  limit lim;
$$;

-- ---------------------------------------------------------------------------
-- Seed: destinos e conhecimento inicial
-- ---------------------------------------------------------------------------
insert into public.destinations (slug, name, country, country_code, iata_code, amadeus_city_code, lat, lng) values
  ('paris', 'Paris', 'França', 'FR', 'CDG', 'PAR', 48.8566, 2.3522),
  ('orlando', 'Orlando', 'Estados Unidos', 'US', 'MCO', 'ORL', 28.5383, -81.3792),
  ('rio-de-janeiro', 'Rio de Janeiro', 'Brasil', 'BR', 'GIG', 'RIO', -22.9068, -43.1729),
  ('lisboa', 'Lisboa', 'Portugal', 'PT', 'LIS', 'LIS', 38.7223, -9.1393),
  ('tokyo', 'Tóquio', 'Japão', 'JP', 'NRT', 'TYO', 35.6762, 139.6503),
  ('bogota', 'Bogotá', 'Colômbia', 'CO', 'BOG', 'BOG', 4.7110, -74.0721),
  ('salvador', 'Salvador', 'Brasil', 'BR', 'SSA', 'SSA', -12.9777, -38.5016),
  ('cusco', 'Cusco', 'Peru', 'PE', 'CUZ', 'CUZ', -13.5319, -71.9675)
on conflict (slug) do nothing;

insert into public.experts (slug, name, bio, specialties, countries, verified, rating, trips_sold) values
  ('marina-costa', 'Marina Costa', 'Viajou 40 países com foco em gastronomia e cultura local. Especialista em Europa e América Latina.', array['gastronomia','cultura','família'], array['França','Portugal','Colômbia'], true, 4.9, 127),
  ('rafael-nomade', 'Rafael Nômade', 'Nômade digital há 6 anos. Expert em destinos urbanos, milhas e viagens solo.', array['milhas','urbano','solo'], array['Japão','Estados Unidos','Brasil'], true, 4.8, 89),
  ('ana-parques', 'Ana Parques', 'Mãe de dois e especialista em viagens em família. Domina Orlando, Disney e destinos kid-friendly.', array['família','parques','Orlando'], array['Estados Unidos','Brasil'], true, 4.95, 203)
on conflict (slug) do nothing;

insert into public.brain_knowledge (expert_id, destination_id, category, title, content, tags, place_name, rating, price_range, best_season)
select
  e.id, d.id, v.category, v.title, v.content, v.tags, v.place_name, v.rating, v.price_range, v.best_season
from (values
  ('marina-costa', 'paris', 'restaurant', 'Le Comptoir du Relais', 'Reserva com antecedência. Menu do chef Yves Camdeborde — um dos melhores bistrôs de Saint-Germain. Peça o menu degustação.', array['gastronomia','bistrô','saint-germain'], 'Le Comptoir du Relais', 4.7, '€€€', 'Primavera e outono'),
  ('marina-costa', 'paris', 'tip', 'Evite filas no Louvre', 'Compre ingresso online com horário marcado. Entrada pela Pirâmide Invertida (Carrousel du Louvre) é muito mais rápida que a fila principal.', array['museu','louvre','dica'], null, null, null, 'Qualquer época'),
  ('marina-costa', 'paris', 'activity', 'Passeio de barco no Sena ao pôr do sol', 'Bateaux Mouches ou Vedettes du Pont-Neuf. Reserve o horário das 19h30 no verão para ver a cidade iluminada.', array['passeio','sena','romântico'], 'Bateaux Mouches', 4.5, '€€', 'Maio a setembro'),
  ('rafael-nomade', 'tokyo', 'tip', 'JR Pass vs Suica', 'Para estadias curtas em Tóquio, Suica/Pasmo é melhor. JR Pass só vale se for a Kyoto/Osaka.', array['transporte','jr-pass','suica'], null, null, null, 'Qualquer época'),
  ('rafael-nomade', 'tokyo', 'restaurant', 'Ichiran Ramen Shibuya', 'Cabines individuais, experiência única. Vá fora do horário de pico (15h-17h) para evitar fila.', array['ramen','shibuya','comida'], 'Ichiran Ramen', 4.6, '¥', 'Qualquer época'),
  ('ana-parques', 'orlando', 'activity', 'Magic Kingdom — roteiro com crianças', 'Chegue na abertura, faça Seven Dwarfs Mine Train primeiro (Genie+). Almoço no Be Our Guest. Parade às 15h.', array['disney','família','parques'], 'Magic Kingdom', 4.9, '$$$', 'Outono e inverno'),
  ('ana-parques', 'orlando', 'hotel', 'Disney''s Art of Animation', 'Melhor custo-benefício Disney para famílias. Quartos temáticos, piscina incrível, transporte gratuito pros parques.', array['hotel','disney','família'], 'Art of Animation', 4.4, '$$', 'Qualquer época'),
  ('marina-costa', 'lisboa', 'restaurant', 'Time Out Market Lisboa', 'Food hall com os melhores chefs de Lisboa. Ideal para provar vários pratos sem reserva.', array['gastronomia','food-hall','baixa'], 'Time Out Market', 4.3, '€€', 'Primavera e verão'),
  ('rafael-nomade', 'rio-de-janeiro', 'activity', 'Trilha do Morro Dois Irmãos', 'Nascer do sol espetacular. Saia 5h30 de Vidigal. Leve água e tênis. Guia local recomendado.', array['trilha','nascer-do-sol','vidigal'], 'Morro Dois Irmãos', 4.8, 'Grátis', 'Inverno (menos calor)'),
  ('marina-costa', 'bogota', 'tip', 'Altitude em Bogotá', 'Bogotá fica a 2.640m. Nos primeiros dias, evite álcool, beba muita água e não faça esforço intenso.', array['saúde','altitude','dica'], null, null, null, 'Qualquer época')
) as v(expert_slug, dest_slug, category, title, content, tags, place_name, rating, price_range, best_season)
join public.experts e on e.slug = v.expert_slug
join public.destinations d on d.slug = v.dest_slug;
