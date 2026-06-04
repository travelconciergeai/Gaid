# Voia — Guia de Setup

Copilot de viagens com cérebro próprio (Supabase + OpenAI) e buscas reais (Amadeus, Google Places).

## 1. Instalar e rodar

```bash
npm install
npm run dev
# http://localhost:5173
```

Para APIs serverless em dev local, use Vercel CLI:

```bash
npx vercel dev
```

## 2. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, execute `supabase/migrations/001_voia_brain.sql`
3. Configure no `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

A migration cria:
- `trips`, `chat_messages`, `profiles` — viagens e chat
- `brain_knowledge` — cérebro curado por experts
- `experts`, `expert_packages` — marketplace de experts
- `destinations`, `place_reviews`, `trip_alerts` — destinos, avaliações, modo viagem
- Seed inicial com 3 experts e 10 dicas reais

## 3. OpenAI

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

Endpoints:
- `/api/chat` — chat conversacional
- `/api/agent` — agente com tool calling (voos, hotéis, passeios, cérebro)

## 4. Amadeus (voos + hotéis)

1. Registre em [developers.amadeus.com](https://developers.amadeus.com)
2. Crie um app (Test ou Production)

```env
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
AMADEUS_ENV=test
```

Endpoints: `/api/search/flights`, `/api/search/hotels`

## 5. Google Places ou RapidAPI (passeios)

**Opção A — Google Places (recomendado)**

```env
GOOGLE_PLACES_API_KEY=
```

**Opção B — RapidAPI TripAdvisor**

```env
RAPIDAPI_KEY=
```

Endpoint: `/api/search/tours`, `/api/search/places`

## 6. Arquitetura

```
Frontend (React/Vite)
  └── tripApi.jsx          ← única fronteira de I/O
        ├── Supabase       ← viagens, chat, perfil
        ├── /api/agent     ← agente Voia (tool calling)
        ├── /api/search/*  ← voos, hotéis, passeios reais
        └── /api/brain/*   ← cérebro de experts

Supabase
  └── brain_knowledge      ← conhecimento curado
  └── experts              ← perfis de experts
  └── expert_packages      ← pacotes vendáveis

APIs externas
  └── Amadeus              ← voos + hotéis
  └── Google Places        ← passeios + lugares
  └── OpenAI               ← IA + agente
```

## 7. Agente Voia — ferramentas

O agente (`/api/agent`) pode executar:

| Ferramenta | O que faz |
|------------|-----------|
| `brain_query` | Consulta dicas de experts no Supabase |
| `search_flights` | Busca voos reais (Amadeus) |
| `search_hotels` | Busca hotéis reais (Amadeus) |
| `search_tours` | Busca passeios (Google/TripAdvisor) |
| `search_places` | Busca restaurantes, cafés, atrações |

No frontend, use `tripApi.sendChatMessage({ ..., useAgent: true })`.

## 8. Deploy (Vercel)

```bash
vercel
```

Configure todas as env vars no painel Vercel (Settings → Environment Variables).
Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou `AMADEUS_API_SECRET` no frontend.

## 9. Próximos passos

- [ ] Modo Viagem com alertas (`trip_alerts`)
- [ ] Check-in e avaliações (`place_reviews`)
- [ ] Wallet e milhas
- [ ] Embeddings pgvector no cérebro
- [ ] Booking/checkout com parceiros
- [ ] Capas automáticas via Unsplash
