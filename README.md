# Gaid — Travel Concierge AI

Concierge de viagens com IA. Frontend de produção, **backend-ready**: visual aprovado, arquitetura estável, **sem dados fictícios apresentados como reais**. Tudo que depende de dados passa por uma fronteira única (`tripApi`) pronta para o backend ser plugado.

> **Para o agente de implementação (Codex/Cursor/Claude Code):** antes de codar, leia `docs/` — especialmente os contratos. As decisões de arquitetura **já estão tomadas**. Não reinvente shapes, não renomeie campos, não decida estrutura. Implemente seguindo os contratos.

---

## Como rodar (app responsivo — recomendado)

Versão unificada **mobile + desktop** (Vite + React):

```bash
npm install
npm run dev
# abra http://localhost:5173
```

Sem `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, o app abre em **modo convidado** (sem tela de login).

## Como rodar (preview legado)

`Gaid Production.html` é um protótipo React de alta fidelidade que roda **direto no navegador** (React + Babel + Tailwind via CDN). Basta abrir o arquivo num servidor estático:

```bash
npx serve .
# abra http://localhost:3000/Gaid%20Production.html
```

Login e onboarding estão **temporariamente desativados** — o app abre direto na Home. Os componentes continuam no código (`app/screens/AuthScreens.jsx`) e podem ser reativados descomentando os gates em `app/App.jsx`.

---

## Estrutura

```
Gaid Production.html              # entry point (ordem de carregamento dos scripts)
Gaid Production (standalone).html # bundle único exportado (opcional, regenerável)
app/
  App.jsx                         # shell: providers + rotas
  icons.jsx                       # ícones SVG inline
  ui.jsx                          # primitivos aprovados + Sidebar + CmdPalette
  core/
    contracts.jsx                 # tipos, helpers (has/orTBD/TBD), formatadores, status↔rótulo
    tripApi.jsx                   # ★ A FRONTEIRA (seam) — onde o backend pluga
    editorial.jsx                 # banco editorial (experts/templates vazios; destinos)
    store.jsx                     # useQuery (4 estados), Session, ActiveTripContext, TripStore
    projections.jsx               # Trip → view-models das telas (paridade visual)
    states.jsx                    # Loading/Empty/Error/Async/Carousel
  screens/                        # telas (data-driven, empty-first)
mobile/ + Gaid Mobile.html        # versão mobile (protótipo)
docs/                             # ★ HANDOFF — contratos e decisões de arquitetura
```

---

## Arquitetura em 4 regras

1. **`Trip` é a fonte única da verdade.** Telas leem projeções (`toTripSummary`/`toTripDetail`), nunca a Trip crua.
2. **`ActiveTripContext` guarda só `activeTripId`** — nunca os dados da viagem.
3. **`tripApi` é a única fronteira de I/O.** Nenhum componente faz fetch ou importa catálogo.
4. **Empty-first.** Sem dado → estado vazio honesto ou "A definir". Nunca inventar destino/data/preço/hotel.

---

## Como plugar o backend (`app/core/tripApi.jsx`)

O seam aceita um adapter único com as chamadas reais, mantendo **assinaturas e formatos de retorno** (ver `docs/03 API Contracts.html` e `docs/10 Phase 1 Foundation Design.html`):

```js
tripApi.__useBackend({
  // viagens
  listTrips, getTrip, createTrip, createTripFromTemplate, patchTrip,
  applyHotel, applyFlight, applyTour,
  // busca (APIs externas: Amadeus/Duffel/etc.)
  searchHotels, searchFlights, searchTours,
  // descoberta / editorial
  listTemplates, getTemplate, listExperts, listDestinations,
  // catálogo
  listPlans,
});
```

Cada método devolve o shape canônico de `core/contracts.jsx`. **Nenhuma tela muda.**

---

## O que está vazio propositalmente (aguardando dados reais)

- **Experts / Roteiros sugeridos** → `core/editorial.jsx` (preencher com conteúdo real do comercial, ou plugar via `listExperts`/`listTemplates`).
- **Hotéis / Voos / Passeios** → vazios até busca real (APIs externas).
- **Minhas viagens / Trip Detail / Planos** → vazios até existir dado real.
- Mantido: `EDITORIAL_DESTINATIONS` (nomes reais de lugares, opções do onboarding).

---

## O que NÃO alterar

- Home (saudação, chatbar, hero), sidebar e navegação aprovadas.
- Arquitetura: `Trip` única, `ActiveTripContext` só com id, fronteira `tripApi`.
- Componentes/cores/pesos/espaçamentos/copy aprovados.
- Projeções como contrato de saída (ajustar a projeção, nunca a tela).
- Não reintroduzir mocks/strings fictícias.

---

## Primeira tarefa recomendada

**Fase 1 — Fundação:** plugar `createTrip` + `getTrip` + `listTrips` e validar o ciclo
**chatbar → cria Trip (draft) → aparece em Minhas Viagens → abre no Roteiro.**
Critérios de aceite completos em `docs/10 Phase 1 Foundation Design.html`.

---

## Caminho de produção (resumo)

Migrar `app/**.jsx` para **Next.js** (App Router) na **Vercel**: converter `window.X` + `<script src>` em `import/export`, instalar React/Tailwind como dependências (sair do CDN), criar API routes seguindo os contratos e plugar no `tripApi`. A estrutura e os contratos **não mudam** nessa migração.
