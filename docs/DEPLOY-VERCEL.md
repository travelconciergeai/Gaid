# Deploy Gaid na Vercel (GitHub)

## 1. Conectar o repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → escolha `travelconciergeai/Gaid`
3. Autorize o GitHub se ainda não estiver conectado

## 2. Configuração do projeto

| Campo | Valor |
|--------|--------|
| Framework Preset | **Vite** (detectado via `vercel.json`) |
| Root Directory | `.` (raiz) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## 3. Variáveis de ambiente

Em **Settings → Environment Variables**, adicione:

| Nome | Onde usar | Obrigatório |
|------|-----------|-------------|
| `OPENAI_API_KEY` | `/api/chat`, `/api/plan`, etc. | Sim, para IA no chat |
| `OPENAI_MODEL` | APIs (opcional) | Não |
| `VITE_SUPABASE_URL` | Frontend auth + trips | Sim, para login e viagens |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Sim, com Supabase |

Sem `VITE_SUPABASE_*`, o app abre em **modo convidado** (só UI local).

Marque as variáveis para **Production**, **Preview** e **Development**.

## 4. Branches

- **Production:** `main`
- **Preview:** cada push em PR (ex.: `cursor/planner-wizard-cover-fixes`) gera URL de preview

## 5. Deploy

Clique **Deploy**. Após o build, a Vercel mostra:

- URL de **Production** (branch `main`)
- URLs de **Preview** (outras branches)

## 6. Testar APIs

- `https://SEU-DOMINIO.vercel.app/api/ping` → deve retornar JSON com `hasOpenAIKey`

## CLI (opcional)

```bash
npm i -g vercel
vercel login
cd /caminho/para/Gaid
vercel link
vercel env pull .env.local
vercel deploy        # preview
vercel --prod        # production
```
